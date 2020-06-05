import * as fastify from 'fastify';
import { FastifyInstance } from 'fastify';
import * as helmet from 'fastify-helmet';
import * as fastJson from 'fast-json-stringify';

import trace from './trace';
import auth from './auth';

import './config';

export const stringifyHealthCheck = fastJson({
  type: 'object',
  properties: {
    status: {
      type: 'string',
    },
  },
});

export default function app(): FastifyInstance {
  const isProd = process.env.NODE_ENV === 'production';

  const app = fastify({
    logger: true,
    disableRequestLogging: true,
    trustProxy: isProd,
  });

  app.register(helmet);
  app.register(trace, { enabled: isProd });
  app.register(auth, { secret: process.env.ACCESS_SECRET });

  app.get('/health', (req, res) => {
    res.type('application/health+json');
    res.send(stringifyHealthCheck({ status: 'ok' }));
  });

  return app;
}
