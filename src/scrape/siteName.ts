import * as puppeteer from 'puppeteer';

export const scrapeSiteName = async (
  page: puppeteer.Page,
): Promise<string | null> => {
  let [name] = await page.$$eval('meta[property="og:site_name"]', (el) =>
    el.map((x): string => x.getAttribute('content')),
  );
  if (!name) {
    [name] = await page.$$eval('title', (el) =>
      el.map((x): string => x.innerHTML),
    );
  }
  return name || null;
};
