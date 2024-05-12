import * as puppeteer from 'puppeteer';
import { getPageType } from './common';

const YT_NAME_SELECTOR = '#page-header h1';

export const scrapeSiteName = async (
  page: puppeteer.Page,
): Promise<string | null> => {
  const pageType = getPageType(page);
  let name: string;
  if (pageType === 'youtube') {
    await page.waitForSelector(YT_NAME_SELECTOR, {
      timeout: 1000,
    });
    [name] = await page.$$eval(YT_NAME_SELECTOR, (el) =>
      el.map((x): string => x.innerHTML),
    );
  }
  if (!name) {
    [name] = await page.$$eval('meta[property="og:site_name"]', (el) =>
      el.map((x): string => x.getAttribute('content')),
    );
  }
  if (!name) {
    [name] = await page.$$eval('title', (el) =>
      el.map((x): string => x.innerHTML),
    );
  }
  return name || null;
};
