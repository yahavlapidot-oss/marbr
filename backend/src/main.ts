import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableShutdownHooks();

  app.use(helmet());

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS: never combine origin:'*' with credentials:true — Chrome rejects it.
  // Use explicit origins from env, falling back to business panel URL.
  const rawOrigins = process.env.ALLOWED_ORIGINS ?? process.env.BUSINESS_PANEL_URL ?? 'http://localhost:3001';
  const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: allowedOrigins, credentials: true });

  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const config = new DocumentBuilder()
    .setTitle('MrBar API')
    .setDescription('Backend API for the MrBar promotions platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`MrBar API running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
}

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', reason instanceof Error ? reason.stack : String(reason));
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', err.stack);
  process.exit(1);
});

bootstrap();
