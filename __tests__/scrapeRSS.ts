import { FastifyInstance } from 'fastify';
import * as puppeteer from 'puppeteer';
import { scrape, scrapeRssLink } from '../src/scrape';
import { setupStaticServer } from './helpers';

let app: FastifyInstance;
let browser: puppeteer.Browser;

beforeAll(async () => {
  app = await setupStaticServer();
  browser = await puppeteer.launch();
});

afterAll(async () => {
  await app.close();
  await browser.close();
});

it('should scrape a single rss', async () => {
  const res = await scrape(
    'http://localhost:6789/singleRSS.html',
    browser,
    scrapeRssLink,
  );
  expect(res).toMatchSnapshot();
});

it('should scrape multiple rss', async () => {
  const res = await scrape(
    'http://localhost:6789/multipleRSS.html',
    browser,
    scrapeRssLink,
  );
  expect(res).toMatchSnapshot();
});

it('should scrape relative rss', async () => {
  const res = await scrape(
    'http://localhost:6789/relativeRSS.html',
    browser,
    scrapeRssLink,
  );
  expect(res).toMatchSnapshot();
});

it('should not find rss', async () => {
  const res = await scrape(
    'http://localhost:6789/noMeta.html',
    browser,
    scrapeRssLink,
  );
  expect(res).toMatchSnapshot();
});
