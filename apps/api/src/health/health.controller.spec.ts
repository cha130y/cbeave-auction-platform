import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';

describe('HealthController', () => {
  const queryRawMock = jest.fn();

  const prisma = {
    $queryRaw: queryRawMock,
  } as unknown as PrismaService;

  const controller = new HealthController(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns process health', () => {
    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'cbeave-api',
      timestamp: expect.any(String) as string,
    });
  });

  it('returns database health when Prisma can query PostgreSQL', async () => {
    queryRawMock.mockResolvedValue([{ '?column?': 1 }]);

    await expect(controller.getDatabaseHealth()).resolves.toEqual({
      status: 'ok',
      database: 'reachable',
      timestamp: expect.any(String) as string,
    });
  });

  it('returns service unavailable when PostgreSQL cannot be reached', async () => {
    queryRawMock.mockRejectedValue(new Error('unreachable'));

    await expect(controller.getDatabaseHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
