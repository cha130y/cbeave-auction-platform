import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { AccessControlModule } from '../auth/access-control.module';
import { UsersController } from './users.controller';
import { CloudinaryModule } from '../infrastructure/cloudinary/cloudinary.module';

@Module({
  providers: [UsersService],
  exports: [UsersService],
  imports: [AccessControlModule, CloudinaryModule],
  controllers: [UsersController],
})
export class UsersModule {}
