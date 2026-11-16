import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

const server = app.listen(env.PORT, env.HOST, () => {
  // eslint-disable-next-line no-console
  console.log(
    `DocVerify AI API listening on http://${env.HOST === '0.0.0.0' ? 'localhost' : env.HOST}:${env.PORT}`,
  );
  // eslint-disable-next-line no-console
  console.log(`Health check: http://localhost:${env.PORT}/api/health`);
});

function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
