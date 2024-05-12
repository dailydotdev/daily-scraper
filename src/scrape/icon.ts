import * as puppeteer from 'puppeteer';
import * as url from 'url';
import { getPageType } from './common';

interface Icon {
  url: string;
  size: number;
}

const YT_ICON_SELECTOR = '#page-header img';

export const scrapeIcon = async (
  page: puppeteer.Page,
): Promise<string | null> => {
  const pageType = getPageType(page);
  let selected: string;
  if (pageType === 'youtube') {
    await page.waitForSelector(YT_ICON_SELECTOR, {
      timeout: 1000,
    });
    [selected] = await page.$$eval(YT_ICON_SELECTOR, (el) =>
      el.map((x): string => x.getAttribute('src')),
    );
  }
  if (!selected) {
    const icons = await page.$$eval('link[rel*="icon"][sizes]', (el) =>
      el.map(
        (x): Icon => ({
          url: x.getAttribute('href'),
          size: parseInt(x.getAttribute('sizes')?.split('x')?.[0] || '0'),
        }),
      ),
    );
    // Take the best resolution icon
    selected = icons.sort((a, b): number => b.size - a.size)?.[0]?.url;
  }
  if (!selected) {
    [selected] = await page.$$eval('link[rel="icon"]', (el) =>
      el.map((x): string => x.getAttribute('href')),
    );
  }
  if (!selected) {
    [selected] = await page.$$eval('link[rel*="apple-touch-icon"]', (el) =>
      el.map((x): string => x.getAttribute('href')),
    );
  }
  if (!selected) {
    [selected] = await page.$$eval(
      'meta[name*="msapplication-TileImage"]',
      (el) => el.map((x): string => x.getAttribute('content')),
    );
  }
  if (!selected) {
    [selected] = await page.$$eval('link[rel="shortcut icon"]', (el) =>
      el.map((x): string => x.getAttribute('href')),
    );
  }
  if (!selected) {
    return null;
  }
  return url.resolve(page.url(), selected);
};
