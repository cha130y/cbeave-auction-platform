import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createE2eApp } from './utils/create-e2e-app';

// Unlike the unit suites, which mock PrismaService, these tests boot the whole
// application. Running them needs all three of:
//
//   1. PostgreSQL reachable at DATABASE_URL
//   2. Migrations applied: pnpm --dir apps/api prisma migrate deploy
//   3. Every variable in src/config/env.validation.ts present in apps/api/.env
//
// Run with: pnpm --dir apps/api test:e2e
describe('API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createE2eApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // A boot smoke test: it fails whenever module wiring breaks or the database
  // is unreachable, which is what the rest of the suite will depend on.
  it('reports a reachable database', () => {
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
});
