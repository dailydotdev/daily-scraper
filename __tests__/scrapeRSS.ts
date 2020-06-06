import { scrape, scrapeRssLink } from '../src/scrape';
import { FastifyInstance } from 'fastify';
import { setupStaticServer } from './helpers';

let app: FastifyInstance;

beforeAll(async () => {
  app = await setupStaticServer();
});

afterAll(() => app.close());

it('should scrape a single rss', async () => {
  const res = await scrape(
    'http://localhost:6789/singleRSS.html',
    scrapeRssLink,
  );
  expect(res).toMatchSnapshot();
});

it('should scrape multiple rss', async () => {
  const res = await scrape(
    'http://localhost:6789/multipleRSS.html',
    scrapeRssLink,
  );
  expect(res).toMatchSnapshot();
});

it('should scrape relative rss', async () => {
  const res = await scrape(
    'http://localhost:6789/relativeRSS.html',
    scrapeRssLink,
  );
  expect(res).toMatchSnapshot();
});

it('should not find rss', async () => {
  const res = await scrape('http://localhost:6789/noMeta.html', scrapeRssLink);
  expect(res).toMatchSnapshot();
});
