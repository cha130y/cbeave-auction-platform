import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { AccessControlModule } from '../auth/access-control.module';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  imports: [AccessControlModule],
})
export class CategoriesModule {}
