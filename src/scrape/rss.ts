import { Readable } from 'stream';
import * as puppeteer from 'puppeteer';
import * as url from 'url';
import * as FeedParser from 'feedparser';

export interface RSS {
  url: string;
  title: string;
}

export interface RSSFeed {
  meta: FeedParser.Meta;
  items: FeedParser.Item[];
}

export const scrapeRssLink = async (page: puppeteer.Page): Promise<RSS[]> => {
  let rss = await page.$$eval('link[rel="alternate"][type*="xml"]', (el) =>
    el.map(
      (x): RSS => ({
        url: x.getAttribute('href'),
        title: x.getAttribute('title'),
      }),
    ),
  );
  if (rss.length > 1) {
    rss = rss.filter((x) => !!x.title);
  } else if (rss.length > 0 && !rss[0].title) {
    rss[0].title = 'RSS';
  }
  return rss.map((x) => ({ ...x, url: url.resolve(page.url(), x.url) }));
};

export const readRssFeed = async (
  page: puppeteer.Page,
  res: puppeteer.HTTPResponse,
): Promise<RSSFeed> => {
  const contentType = res.headers()['content-type'];
  if (contentType.indexOf('xml') > -1) {
    const feed = await res.text();
    const parser = new FeedParser({ normalize: true, addmeta: true });

    const textStream = new Readable();
    textStream.push(feed, 'utf-8');
    textStream.push(null, 'utf-8');

    let rssFeed: RSSFeed;
    const promise = new Promise<RSSFeed>((resolve, reject) => {
      parser.on('readable', function () {
        rssFeed = { meta: this.meta, items: [] };
        let item: FeedParser.Item;
        while ((item = this.read())) {
          rssFeed.items.push(item);
        }
      });
      parser.on('error', reject);
      parser.on('end', () => resolve(rssFeed));
    });
    textStream.pipe(parser);
    return promise;
  }
  throw new Error('invalid content type');
};
