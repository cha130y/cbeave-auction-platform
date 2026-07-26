import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { CategoriesModule } from './categories/categories.module';
import { AuctionsModule } from './auctions/auctions.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    HealthModule,
    AuthModule,
    CategoriesModule,
    AuctionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
