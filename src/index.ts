import fastify from 'fastify';
import { FastifyInstance } from 'fastify';
import helmet from 'fastify-helmet';
import * as fastJson from 'fast-json-stringify';
// import * as rateLimit from 'fastify-rate-limit';
import * as puppeteer from 'puppeteer';
import * as genericPool from 'generic-pool';

import './config';
import trace from './trace';
import auth from './auth';
import {
  scrape,
  scrapeIcon,
  scrapeRssLink,
  scrapeSiteName,
  readRssFeed,
  RSS,
} from './scrape';
import { Screenshot, ScreenshotType } from './types';

export const stringifyHealthCheck = fastJson({
  type: 'object',
  properties: {
    status: {
      type: 'string',
    },
  },
});

interface ScrapeSourceWebsite {
  type: 'website';
  website?: string;
  rss: RSS[];
  logo?: string;
  name?: string;
}

interface ScrapeSourceRSS {
  type: 'rss';
  rss: string;
  website: string;
}

interface ScrapeSourceUnavailable {
  type: 'unavailable';
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ScrapeSourceResult = ScrapeSourceWebsite | ScrapeSourceUnavailable;
type ScrapeMediumVoters = { voters?: number; failed?: boolean; error?: string };

const scrapeSource = async (
  page: puppeteer.Page,
): Promise<ScrapeSourceWebsite> => {
  const [logo, rss, name] = await Promise.all([
    scrapeIcon(page),
    scrapeRssLink(page),
    scrapeSiteName(page),
  ]);
  return {
    type: 'website',
    website: page.url(),
    logo,
    rss,
    name,
  };
};

const scrapeMediumVoters = async (
  page: puppeteer.Page,
  res: puppeteer.HTTPResponse,
): Promise<ScrapeMediumVoters> => {
  const status = res.status();
  if (status !== 200) {
    if (status >= 400 && status < 500) {
      return { failed: true, error: '4xx' };
    }
    return { failed: true };
  }
  const state = await page.evaluate(() => window['__APOLLO_STATE__']);
  if (state) {
    const postKeys = Object.keys(state).filter((key) =>
      key.startsWith('Post:'),
    );
    const voters = postKeys
      .map((key) => state[key].voterCount)
      .find((voters) => voters >= 0);
    if (voters >= 0) {
      return {
        voters,
      };
    }
  }
  return { failed: true };
};

const pptrPool = genericPool.createPool(
  {
    create: () =>
      puppeteer.launch({
        headless: true,
        args: ['--disable-dev-shm-usage', '--disable-gpu', '--no-sandbox'],
      }),
    destroy: (client) => client.close(),
  },
  {
    min: 5,
    max: 15,
    evictionRunIntervalMillis: 1000 * 60,
    acquireTimeoutMillis: 1000 * 10,
    softIdleTimeoutMillis: 1000 * 60 * 5,
  },
);

const acquireAndRelease = async <T>(
  callback: (browser: puppeteer.Browser) => Promise<T>,
): Promise<T> => pptrPool.use(callback);

export default function app(): FastifyInstance {
  const isProd = process.env.NODE_ENV === 'production';

  const app = fastify({
    logger: true,
    disableRequestLogging: true,
    trustProxy: isProd,
  });
  app.server.keepAliveTimeout = 650 * 1000;

  pptrPool.on('factoryCreateError', (err) => {
    app.log.fatal({ err }, 'failed to create a puppeteer instance');
  });

  pptrPool.on('factoryDestroyError', (err) => {
    app.log.fatal({ err }, 'failed to destroy a puppeteer instance');
  });

  app.register(helmet);
  app.register(trace, { enabled: isProd });
  app.register(auth, { secret: process.env.ACCESS_SECRET });

  app.addHook('onClose', async (instance, done) => {
    await pptrPool.drain();
    await pptrPool.clear();
    done();
  });

  app.get('/health', (req, res) => {
    res.type('application/health+json');
    res.send(stringifyHealthCheck({ status: 'ok' }));
  });

  app.get('/ready', (req, res) => {
    const isBusy = pptrPool.available === 0;
    res.type('application/health+json');
    if (isBusy) {
      res
        .status(503)
        .send(stringifyHealthCheck({ status: 'no available resources' }));
    } else {
      res.send(stringifyHealthCheck({ status: 'ok' }));
    }
  });

  // if (process.env.NODE_ENV !== 'test') {
  //   app.register(rateLimit, {
  //     max: 5,
  //     timeWindow: '1 minute',
  //     prefix: '/scrape',
  //   });
  // }

  app.get<{ Querystring: { url?: string } }>(
    '/scrape/source',
    async (req, res) => {
      const { url } = req.query;
      if (!url || !url.length) {
        return res.status(400).send();
      }
      req.log.info({ url }, 'starting to scrape source');
      try {
        await acquireAndRelease(async (browser) => {
          let data = await scrape(
            url,
            browser,
            async (
              page,
              res,
            ): Promise<ScrapeSourceWebsite | ScrapeSourceRSS> => {
              if (res.status() >= 400) {
                throw new Error('unexpected response');
              }

              page.on('error', (msg) => {
                throw msg;
              });

              const [source, rss] = await Promise.all([
                scrapeSource(page),
                readRssFeed(page, res).catch(() => null),
              ]);
              if (rss) {
                return {
                  type: 'rss',
                  rss: page.url(),
                  website: rss?.meta?.link,
                };
              }
              return source;
            },
          );
          if (data.type === 'rss') {
            const url = data.rss;
            try {
              data = await scrape(
                data.website?.split('?')?.[0],
                browser,
                scrapeSource,
                'domcontentloaded',
              );
            } catch (err) {
              data = { type: 'website', rss: [] };
            }
            data.rss = [{ title: 'RSS', url }];
          }
          if (!data.logo) {
            data.logo =
              'https://res.cloudinary.com/daily-now/image/upload/logos/placeholder.jpg';
          }
          res.status(200).send(data);
        });
      } catch (err) {
        req.log.warn({ err, url }, 'failed to scrape');
        res.status(200).send({ type: 'unavailable' });
      }
    },
  );

  app.get<{ Querystring: { url?: string } }>(
    '/scrape/mediumVoters',
    async (req, res) => {
      const { url } = req.query;
      if (!url || !url.length) {
        return res.status(400).send();
      }
      await acquireAndRelease(async (browser) => {
        const data = await scrape(url, browser, scrapeMediumVoters);
        res.status(200).send(data);
      });
    },
  );

  app.post<{ Body: ScreenshotType }>(
    '/screenshot',
    {
      schema: {
        body: Screenshot,
      },
    },
    async (req, res) => {
      await acquireAndRelease(async (browser) => {
        const page = await browser.newPage();
        if (req.body.url) {
          await page.setViewport({
            width: 1280,
            height: 768,
            deviceScaleFactor: 2,
          });
          await page.goto(req.body.url, {
            waitUntil: 'networkidle0',
            timeout: 10000,
          });
          await page.evaluate(() => {
            document.documentElement.style.background = 'transparent';
            document.documentElement.style.fontFamily = "'Roboto'";
          });
        } else {
          await page.setContent(req.body.content, {
            waitUntil: 'load',
            timeout: 10000,
          });
        }

        const element = await page.$(req.body.selector);
        const buffer = await element.screenshot({
          type: 'png',
          encoding: 'binary',
          omitBackground: true,
        });
        res.type('image/png').send(buffer);
      });
    },
  );

  return app;
}
