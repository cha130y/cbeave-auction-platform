import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { AccessControlModule } from '../auth/access-control.module';
import { UsersController } from './users.controller';

@Module({
  providers: [UsersService],
  exports: [UsersService],
  imports: [AccessControlModule],
  controllers: [UsersController],
})
export class UsersModule {}
