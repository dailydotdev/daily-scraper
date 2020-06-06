import { scrape, scrapeSiteName } from '../src/scrape';
import { FastifyInstance } from 'fastify';
import { setupStaticServer } from './helpers';

let app: FastifyInstance;

beforeAll(async () => {
  app = await setupStaticServer();
});

afterAll(() => app.close());

it('should scrape the site name', async () => {
  const res = await scrape(
    'http://localhost:6789/siteName.html',
    scrapeSiteName,
  );
  expect(res).toMatchSnapshot();
});

it('should return null when no site name', async () => {
  const res = await scrape('http://localhost:6789/noMeta.html', scrapeSiteName);
  expect(res).toEqual(null);
});
