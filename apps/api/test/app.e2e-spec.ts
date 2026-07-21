import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health/database (GET)', () => {
    return request(app.getHttpServer())
      .get('/health/database')
      .expect(200)
      .expect((response) => {
        const body = response.body as {
          status: string;
          database: string;
          timestamp: string;
        };

        expect(body).toEqual(
          expect.objectContaining({
            status: 'ok',
            database: 'reachable',
          }),
        );
        expect(body.timestamp).toEqual(expect.any(String));
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
