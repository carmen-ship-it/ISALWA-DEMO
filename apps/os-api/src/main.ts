import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { validateOsApiEnvironment, OsEnvValidationError } from './env-validation';

async function bootstrap() {
  try {
    validateOsApiEnvironment();
  } catch (err) {
    const message =
      err instanceof OsEnvValidationError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Startup environment validation failed';
    // eslint-disable-next-line no-console
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'os-api-startup',
        code: 'OS_ENV_VALIDATION_FAILED',
        message,
      }),
    );
    process.exit(1);
  }

  const { AppModule } = await import('./app.module');
  const env = validateOsApiEnvironment();
  const app = await NestFactory.create(AppModule, { cors: false });
  app.enableCors({
    origin: env.corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'x-os-organization-id',
      'x-os-member-id',
      'x-os-person-id',
      'x-os-auth-identity-id',
      'x-correlation-id',
    ],
  });
  app.setGlobalPrefix('v1');
  app.enableShutdownHooks();

  const { resolveListenPort } = await import('./env-validation');
  const port = resolveListenPort();
  const host = process.env.OS_API_HOST?.trim() || '0.0.0.0';
  await app.listen(port, host);

  // eslint-disable-next-line no-console
  console.log(`ISALWA OS API listening on http://${host}:${port}/v1/health`);
}

void bootstrap();
