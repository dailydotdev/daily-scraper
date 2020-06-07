import { FastifyInstance } from 'fastify';
import * as puppeteer from 'puppeteer';
import { scrape, scrapeSiteName } from '../src/scrape';
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

it('should scrape the site name', async () => {
  const res = await scrape(
    'http://localhost:6789/siteName.html',
    browser,
    scrapeSiteName,
  );
  expect(res).toMatchSnapshot();
});

it('should fallback to title', async () => {
  const res = await scrape(
    'http://localhost:6789/title.html',
    browser,
    scrapeSiteName,
  );
  expect(res).toEqual('Daily');
});

it('should return null when no site name', async () => {
  const res = await scrape(
    'http://localhost:6789/noMeta.html',
    browser,
    scrapeSiteName,
  );
  expect(res).toEqual(null);
});
