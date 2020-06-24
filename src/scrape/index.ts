import * as puppeteer from 'puppeteer';

type Scraper<T> = (page: puppeteer.Page, res: puppeteer.Response) => Promise<T>;

export async function scrape<T>(
  url: string,
  browser: puppeteer.Browser,
  scraper: Scraper<T>,
): Promise<T> {
  const page = await browser.newPage();
  try {
    const res = await page.goto(url, {
      waitUntil: 'load',
      timeout: 20000,
    });
    const ret = await scraper(page, res);
    await page.close();
    return ret;
  } catch (err) {
    await page.close();
    throw err;
  }
}

export * from './icon';
export * from './rss';
export * from './siteName';
