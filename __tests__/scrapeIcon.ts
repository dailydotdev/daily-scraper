import { scrape, scrapeIcon } from '../src/scrape';
import { FastifyInstance } from 'fastify';
import { setupStaticServer } from './helpers';

let app: FastifyInstance;

beforeAll(async () => {
  app = await setupStaticServer();
});

afterAll(() => app.close());

it('should scrape a the best resolution icon', async () => {
  const res = await scrape('http://localhost:6789/icon.html', scrapeIcon);
  expect(res).toMatchSnapshot();
});

it('should scrape icon if size is not available', async () => {
  const res = await scrape('http://localhost:6789/iconNoSize.html', scrapeIcon);
  expect(res).toMatchSnapshot();
});

it('should fallback to apple-touch-icon when icon is not available', async () => {
  const res = await scrape(
    'http://localhost:6789/appleTouchIcon.html',
    scrapeIcon,
  );
  expect(res).toMatchSnapshot();
});

it('should fallback to msapplication-TileImage', async () => {
  const res = await scrape('http://localhost:6789/tileImage.html', scrapeIcon);
  expect(res).toMatchSnapshot();
});

it('should return absolute url', async () => {
  const res = await scrape('http://localhost:6789/relIcon.html', scrapeIcon);
  expect(res).toMatchSnapshot();
});

it('should return null when no image', async () => {
  const res = await scrape('http://localhost:6789/noMeta.html', scrapeIcon);
  expect(res).toEqual(null);
});
