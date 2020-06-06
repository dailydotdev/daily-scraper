import * as puppeteer from 'puppeteer';

export const scrapeSiteName = async (
  page: puppeteer.Page,
): Promise<string | null> => {
  const name = await page.$$eval('meta[property="og:site_name"]', (el) =>
    el.map((x): string => x.getAttribute('content')),
  );
  return name?.[0] || null;
};
