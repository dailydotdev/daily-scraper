import * as puppeteer from 'puppeteer';

export type PageType = 'youtube' | 'generic';

const isYouTubeChannelPath = (path: string): boolean =>
  path.startsWith('/channel/') ||
  path.startsWith('/c/') ||
  path.startsWith('/user/') ||
  /^\/@[^/]+/.test(path);

export const getPageType = (page: puppeteer.Page): PageType => {
  try {
    const parsedUrl = new URL(page.url());
    const isYouTubeHost =
      parsedUrl.hostname === 'youtube.com' ||
      parsedUrl.hostname.endsWith('.youtube.com');

    if (isYouTubeHost && isYouTubeChannelPath(parsedUrl.pathname)) {
      return 'youtube';
    }
  } catch {
    // Fall back to generic page scraping for invalid URLs.
  }

  return 'generic';
};
