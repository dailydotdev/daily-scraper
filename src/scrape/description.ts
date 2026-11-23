import * as puppeteer from 'puppeteer';

const MAX_TEXT_LENGTH = 3000;

export const scrapeDescription = async (
  page: puppeteer.Page,
): Promise<string | null> => {
  for (const selector of [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[name="twitter:description"]',
  ]) {
    const [description] = await page.$$eval(selector, (el) =>
      el.map((x): string => x.getAttribute('content')?.trim()),
    );
    if (description) {
      return description;
    }
  }
  return null;
};

// The visible text at the top of the page, for callers that summarize a site
// when it has no description of its own
export const scrapeText = async (
  page: puppeteer.Page,
): Promise<string | null> => {
  const text = await page.evaluate(() => document.body?.innerText || '');
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized ? normalized.slice(0, MAX_TEXT_LENGTH) : null;
};
