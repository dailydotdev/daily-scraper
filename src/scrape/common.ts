import * as puppeteer from 'puppeteer';

export type PageType = 'youtube' | 'generic';

export const getPageType = (page: puppeteer.Page): PageType => {
  const url = page.url();
  if (url.includes('youtube.com/channel')) {
    return 'youtube';
  }
  return 'generic';
};
