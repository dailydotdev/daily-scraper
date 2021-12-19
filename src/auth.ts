import {
  FastifyInstance,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  FastifyRequest,
} from 'fastify';
import fp from 'fastify-plugin';

declare module 'fastify' {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  interface FastifyRequest {
    userId?: string;
    premium?: boolean;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars */
}

interface Options {
  secret: string;
}

const plugin = async (
  fastify: FastifyInstance,
  opts: Options,
): Promise<void> => {
  // Machine-to-machine authentication
  fastify.addHook('preHandler', async (req) => {
    if (
      req.headers['authorization'] === `Service ${opts.secret}` &&
      req.headers['user-id'] &&
      req.headers['logged-in'] === 'true'
    ) {
      req.userId = req.headers['user-id'] as string;
      req.premium = req.headers.premium === 'true';
    } else {
      delete req.headers['user-id'];
      delete req.headers['logged-in'];
    }
  });
};

export default fp(plugin, {
  name: 'authentication',
});
