import * as puppeteer from 'puppeteer';
import { getPageType } from './common';

export const scrapeSiteName = async (
  page: puppeteer.Page,
): Promise<string | null> => {
  const pageType = getPageType(page);
  let name: string;
  if (pageType === 'youtube') {
    await page.waitForSelector('#channel-header #channel-name #text', {
      timeout: 1000,
    });
    [name] = await page.$$eval('#channel-header #channel-name #text', (el) =>
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
