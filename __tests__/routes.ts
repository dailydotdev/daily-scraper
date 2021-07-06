import { FastifyInstance } from 'fastify';
import * as request from 'supertest';
import { setupStaticServer } from './helpers';
import appFunc from '../src';

let fileServer: FastifyInstance;
let app: FastifyInstance;

beforeAll(async () => {
  app = appFunc();
  return app.ready();
});

afterEach(() => fileServer.close());

afterAll(() => app.close());

it('should return bad request when url is not provided', async () => {
  fileServer = await setupStaticServer('rss.xml', 'source.html');
  await request(app.server).get('/scrape/source').expect(400);
});

it('should scrape the website for source information', async () => {
  fileServer = await setupStaticServer('rss.xml', 'source.html');
  const res = await request(app.server)
    .get('/scrape/source')
    .query({ url: 'http://localhost:6789/' })
    .expect(200);
  expect(res.body).toMatchSnapshot();
});

it('should scrape even if not all information is available', async () => {
  fileServer = await setupStaticServer('rss.xml', 'partialSource.html');
  const res = await request(app.server)
    .get('/scrape/source')
    .query({ url: 'http://localhost:6789/' })
    .expect(200);
  expect(res.body).toMatchSnapshot();
});

it('should scrape rss feed and crawl the website', async () => {
  fileServer = await setupStaticServer('rss.xml', 'multipleSources.html');
  const res = await request(app.server)
    .get('/scrape/source')
    .query({ url: 'http://localhost:6789/rss.xml' })
    .expect(200);
  expect(res.body).toMatchSnapshot();
});

it('should scrape rss feed even if website is not available', async () => {
  fileServer = await setupStaticServer('rss.xml');
  const res = await request(app.server)
    .get('/scrape/source')
    .query({ url: 'http://localhost:6789/rss.xml' })
    .expect(200);
  expect(res.body).toMatchSnapshot();
});

it('should return 200 even if website is not available', async () => {
  fileServer = await setupStaticServer();
  const res = await request(app.server)
    .get('/scrape/source')
    .query({ url: 'http://localhost:6789/notfound' })
    .expect(200);
  expect(res.body).toMatchSnapshot();
});

it('should return the number of voters', async () => {
  fileServer = await setupStaticServer();
  const res = await request(app.server)
    .get('/scrape/mediumVoters')
    .query({ url: 'http://localhost:6789/mediumVoters.html' })
    .expect(200);
  expect(res.body).toEqual({ voters: 16 });
});

it('should return failed response when cannot find the number of voters', async () => {
  fileServer = await setupStaticServer();
  const res = await request(app.server)
    .get('/scrape/mediumVoters')
    .query({ url: 'http://localhost:6789/noMediumVoters.html' })
    .expect(200);
  expect(res.body).toEqual({ failed: true });
});

it('should indicate that the medium article does not exist', async () => {
  fileServer = await setupStaticServer();
  const res = await request(app.server)
    .get('/scrape/mediumVoters')
    .query({ url: 'http://localhost:6789/notfound.html' })
    .expect(200);
  expect(res.body).toEqual({ failed: true, error: '4xx' });
});
