import * as http from 'http';
import { join } from 'path';
import fastify, { FastifyInstance } from 'fastify';
import fastifyStatic from 'fastify-static';

export const setupStaticServer = async (
  rss?: string,
  index?: string,
): Promise<FastifyInstance> => {
  const app = fastify({ logger: false });
  app.register(fastifyStatic, {
    root: join(__dirname, 'fixture'),
    prefix: '/',
    setHeaders(res: http.ServerResponse, path: string): void {
      if (rss && path.indexOf(rss) > -1) {
        res.setHeader('content-type', 'application/rss+xml');
      }
    },
  });
  if (rss) {
    app.get('/rss.xml', (req, res) => {
      res.sendFile(rss);
    });
  }
  if (index) {
    app.get('/', (req, res) => {
      res.sendFile(index);
    });
  }
  await app.listen(6789);
  return app;
};
