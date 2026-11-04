import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '128kb' }));
  app.enableShutdownHooks();
  // shortcut: local demonstration only; add identity and access checks before shared use.
  await app.listen(Number(process.env.PORT ?? 3001), '127.0.0.1');
}

bootstrap().catch(() => {
  console.error('API could not start. Check the database connection and server configuration.');
  process.exitCode = 1;
});
