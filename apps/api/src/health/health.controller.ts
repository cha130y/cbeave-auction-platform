import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
}

interface DatabaseHealthResponse {
  status: 'ok';
  database: 'reachable';
  timestamp: string;
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'cbeave-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('database')
  async getDatabaseHealth(): Promise<DatabaseHealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        database: 'reachable',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unreachable',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
