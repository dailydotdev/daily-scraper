import { FastifyInstance } from 'fastify';
import * as puppeteer from 'puppeteer';
import { scrape, scrapeIcon } from '../src/scrape';
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

it('should scrape a the best resolution icon', async () => {
  const res = await scrape(
    'http://localhost:6789/icon.html',
    browser,
    scrapeIcon,
  );
  expect(res).toMatchSnapshot();
});

it('should scrape icon if size is not available', async () => {
  const res = await scrape(
    'http://localhost:6789/iconNoSize.html',
    browser,
    scrapeIcon,
  );
  expect(res).toMatchSnapshot();
});

it('should fallback to apple-touch-icon when icon is not available', async () => {
  const res = await scrape(
    'http://localhost:6789/appleTouchIcon.html',
    browser,
    scrapeIcon,
  );
  expect(res).toMatchSnapshot();
});

it('should fallback to msapplication-TileImage', async () => {
  const res = await scrape(
    'http://localhost:6789/tileImage.html',
    browser,
    scrapeIcon,
  );
  expect(res).toMatchSnapshot();
});

it('should return absolute url', async () => {
  const res = await scrape(
    'http://localhost:6789/relIcon.html',
    browser,
    scrapeIcon,
  );
  expect(res).toMatchSnapshot();
});

it('should return null when no image', async () => {
  const res = await scrape(
    'http://localhost:6789/noMeta.html',
    browser,
    scrapeIcon,
  );
  expect(res).toEqual(null);
});
