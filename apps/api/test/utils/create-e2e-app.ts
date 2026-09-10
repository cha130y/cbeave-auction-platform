import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';

// Mirrors the global configuration in src/main.ts so end-to-end tests hit the
// same request pipeline as production. Without the pipe a test would accept a
// payload that the deployed API rejects, and without the parser every
// refresh-cookie flow would read an empty request.cookies.
//
// CORS and Swagger are deliberately left out: both only matter to a browser,
// and supertest is not one.
export async function createE2eApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication<App> = moduleFixture.createNestApplication();

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    }),
  );

  await app.init();

  return app;
}
