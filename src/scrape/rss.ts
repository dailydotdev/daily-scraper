import { Readable } from 'stream';
import puppeteer, { Page, HTTPResponse } from 'puppeteer';
import { RSS, RSSFeed } from './types'; 

export const scrapeRssLink = async (page: Page): Promise<RSS[]> => {
  const rss = await page.$$eval('link[rel="alternate"][type*="xml"]', (elements) =>
    elements.map((element) => ({
      url: element.getAttribute('href'),
      title: element.getAttribute('title') || 'RSS',
    }))
  );
  return rss.map((item) => ({ ...item, url: new URL(item.url, page.url()).toString() }));
};

export const readRssFeed = async (page: Page, res: HTTPResponse): Promise<RSSFeed> => {
  const contentType = res.headers()['content-type'];
  
  if (contentType.includes('xml')) {
    const feed = await res.text();
    const parser = new FeedParser({ normalize: true, addmeta: true });
    
    const textStream = new Readable({ read() {} });
    textStream.push(feed, 'utf-8');
    textStream.push(null);
    
    return new Promise<RSSFeed>((resolve, reject) => {
      let rssFeed: RSSFeed = { meta: parser.meta, items: [] };
      parser.on('readable', () => {
        let item;
        while ((item = parser.read())) {
          rssFeed.items.push(item);
        }
      });
      parser.on('error', reject);
      parser.on('end', () => resolve(rssFeed));
    });
  } else {
    throw new Error('Invalid content type');
  }
};
