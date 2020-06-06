import * as puppeteer from 'puppeteer';

type Scraper<T> = (page: puppeteer.Page, res: puppeteer.Response) => Promise<T>;

export async function scrape<T>(
  url: string,
  browser: puppeteer.Browser,
  scraper: Scraper<T>,
): Promise<T> {
  const page = await browser.newPage();
  const res = await page.goto(url, {
    waitUntil: 'load',
    timeout: 20000,
  });
  return scraper(page, res);
}

export * from './icon';
export * from './rss';
export * from './siteName';
