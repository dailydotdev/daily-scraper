import * as fastify from 'fastify';
import { FastifyInstance } from 'fastify';
import * as helmet from 'fastify-helmet';
import * as fastJson from 'fast-json-stringify';
import * as rateLimit from 'fastify-rate-limit';
import * as caching from 'fastify-caching';
import * as abstractCache from 'abstract-cache';
import * as puppeteer from 'puppeteer';

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

export default function app(): FastifyInstance {
  const isProd = process.env.NODE_ENV === 'production';

  const app = fastify({
    logger: true,
    disableRequestLogging: true,
    trustProxy: isProd,
  });

  app.register(helmet);
  app.register(trace, { enabled: isProd });
  app.register(auth, { secret: process.env.ACCESS_SECRET });

  app.get('/health', (req, res) => {
    res.type('application/health+json');
    res.send(stringifyHealthCheck({ status: 'ok' }));
  });

  if (process.env.NODE_ENV !== 'test') {
    app.register(rateLimit, {
      max: 5,
      timeWindow: '1 minute',
      prefix: '/scrape',
    });
  }

  app.register(caching, {
    privacy: 'public',
    expiresIn: 3600,
    cache: abstractCache({ useAwait: false }),
    prefix: '/scrape',
  });

  app.get('/scrape/source', async (req, res) => {
    const { url } = req.query;
    if (!url || !url.length) {
      return res.status(400).send();
    }
    try {
      let data = await scrape(
        url,
        async (page, res): Promise<ScrapeSourceWebsite | ScrapeSourceRSS> => {
          if (res.status() >= 400) {
            throw new Error('unexpected response');
          }
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
          data = await scrape(data.website, scrapeSource);
        } catch (err) {
          data = { type: 'website', rss: [] };
        }
        data.rss = [{ title: 'RSS', url }];
      }
      res.status(200).send(data);
    } catch (err) {
      req.log.warn({ err, url }, 'failed to scrape');
      res.status(200).send({ type: 'unavailable' });
    }
  });

  return app;
}
