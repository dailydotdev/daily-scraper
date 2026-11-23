import { FastifyInstance } from 'fastify';
import * as puppeteer from 'puppeteer';
import { scrape, scrapeDescription, scrapeText } from '../src/scrape';
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

it('should fall back to the og description', async () => {
  const res = await scrape(
    'http://localhost:6789/description.html',
    browser,
    scrapeDescription,
  );
  expect(res).toEqual('Where developers grow together');
});

it('should return null when there is no description', async () => {
  const res = await scrape(
    'http://localhost:6789/noMeta.html',
    browser,
    scrapeDescription,
  );
  expect(res).toBeNull();
});

it('should return the page text with whitespace collapsed', async () => {
  const res = await scrape(
    'http://localhost:6789/description.html',
    browser,
    scrapeText,
  );
  expect(res).toEqual('daily.dev The homepage developers deserve');
});
