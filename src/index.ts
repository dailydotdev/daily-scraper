import * as fastify from 'fastify';
import { FastifyInstance, FastifyReply } from 'fastify';
import * as helmet from 'fastify-helmet';
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
import { ServerResponse } from 'http';

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

type ScrapeSourceResult = ScrapeSourceWebsite | ScrapeSourceUnavailable;
type ScrapeMediumVoters = { voters?: number; failed?: boolean };

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
): Promise<ScrapeMediumVoters> => {
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
    min: 1,
    max: 5,
    evictionRunIntervalMillis: 1000 * 60,
    acquireTimeoutMillis: 1000 * 10,
    softIdleTimeoutMillis: 1000 * 60 * 5,
  },
);

export default function app(): FastifyInstance {
  const isProd = process.env.NODE_ENV === 'production';

  const app = fastify({
    logger: true,
    disableRequestLogging: true,
    trustProxy: isProd,
  });

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

  // if (process.env.NODE_ENV !== 'test') {
  //   app.register(rateLimit, {
  //     max: 5,
  //     timeWindow: '1 minute',
  //     prefix: '/scrape',
  //   });
  // }

  app.get(
    '/scrape/source',
    async (req, res): Promise<FastifyReply<ScrapeSourceResult | unknown>> => {
      const { url } = req.query;
      if (!url || !url.length) {
        return res.status(400).send();
      }
      req.log.info({ url }, 'starting to scrape source');
      const browser = await pptrPool.acquire();
      try {
        let data = await scrape(
          url,
          browser,
          async (page, res): Promise<ScrapeSourceWebsite | ScrapeSourceRSS> => {
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
              return { type: 'rss', rss: page.url(), website: rss?.meta?.link };
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
      } catch (err) {
        req.log.warn({ err, url }, 'failed to scrape');
        res.status(200).send({ type: 'unavailable' });
      }
      await pptrPool.release(browser);
    },
  );

  app.get(
    '/scrape/mediumVoters',
    async (
      req,
      res,
    ): Promise<FastifyReply<ScrapeMediumVoters | ServerResponse>> => {
      const { url } = req.query;
      if (!url || !url.length) {
        return res.status(400).send();
      }
      const browser = await pptrPool.acquire();
      const data = await scrape(url, browser, scrapeMediumVoters);
      res.status(200).send(data);
      await pptrPool.release(browser);
    },
  );

  return app;
}
