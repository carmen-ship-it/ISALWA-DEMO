import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('v1');
  const port = Number(process.env.API_PORT ?? 4000);
  const host = process.env.API_HOST?.trim() || '0.0.0.0';
  await app.listen(port, host);
  // eslint-disable-next-line no-console
  console.log(`ISALWA API listening on http://${host}:${port}/v1/health`);
}

void bootstrap();
