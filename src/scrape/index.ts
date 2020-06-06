import * as puppeteer from 'puppeteer';

type Scraper<T> = (page: puppeteer.Page, res: puppeteer.Response) => Promise<T>;

export async function scrape<T>(url: string, scraper: Scraper<T>): Promise<T> {
  const browser = await puppeteer.launch({
    args: ['--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  const res = await page.goto(url, {
    waitUntil: 'load',
    timeout: 10000,
  });
  try {
    const data = await scraper(page, res);
    await browser.close();
    return data;
  } catch (err) {
    await browser.close();
    throw err;
  }
}

export * from './icon';
export * from './rss';
export * from './siteName';
