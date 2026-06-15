import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  const frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');

  // Parse allowed CORS origins (comma-separated list, stripping trailing slashes)
  const allowedOrigins = frontendUrl
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''));

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'script-src': ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
          'style-src': ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
          'connect-src': ["'self'", 'cdnjs.cloudflare.com', 'ws:', 'wss:', 'http://localhost:4000', 'https://order-hub-backend.vercel.app'],
        },
      },
    }),
  );
  app.use(compression());
  app.use(cookieParser());

  // CORS — allow the Next.js frontend(s)
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('OrderHub API')
    .setDescription('Cafe & Restaurant POS REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'OrderHub API Docs',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
    ],
    customCssUrl: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.css',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.css',
    ],
  });
  logger.log(`Swagger: http://localhost:${port}/api/docs`);

  await app.listen(port);
  logger.log(`🚀 OrderHub API running on http://localhost:${port}/api`);
}

bootstrap();
