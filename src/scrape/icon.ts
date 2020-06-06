import * as puppeteer from 'puppeteer';
import * as url from 'url';

interface Icon {
  url: string;
  size: number;
}

export const scrapeIcon = async (
  page: puppeteer.Page,
): Promise<string | null> => {
  const icons = await page.$$eval('link[rel="icon"]', (el) =>
    el.map(
      (x): Icon => ({
        url: x.getAttribute('href'),
        size: parseInt(x.getAttribute('sizes')?.split('x')?.[0] || '0'),
      }),
    ),
  );
  // Take the best resolution icon
  let selected = icons.sort((a, b): number => b.size - a.size)?.[0]?.url;
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
    return null;
  }
  return url.resolve(page.url(), selected);
};
