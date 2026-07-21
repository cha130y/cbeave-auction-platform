import { ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const isHealthyMock = jest.fn<PrismaService['isHealthy']>();
  const prisma = {
    isHealthy: isHealthyMock,
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
    isHealthyMock.mockResolvedValue(true);

    await expect(controller.getDatabaseHealth()).resolves.toEqual({
      status: 'ok',
      database: 'reachable',
      timestamp: expect.any(String) as string,
    });
  });

  it('returns service unavailable when PostgreSQL cannot be reached', async () => {
    isHealthyMock.mockRejectedValue(new Error('unreachable'));

    await expect(controller.getDatabaseHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
