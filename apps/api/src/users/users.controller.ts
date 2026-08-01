import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Patch,
  UseGuards,
  ParseFilePipeBuilder,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/types/access-token-payload.type';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';
import { buildFullName } from './utils/build-full-name.util';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  MAX_USER_AVATAR_SIZE_BYTES,
  USER_AVATAR_FILE_TYPE_PATTERN,
} from './constants/user-avatar.constant';

type CurrentUserRecord = NonNullable<
  Awaited<ReturnType<UsersService['findCurrentUserById']>>
>;

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private mapCurrentUserResponse(
    user: CurrentUserRecord,
  ): CurrentUserResponseDto {
    const profile = user.userProfile
      ? {
          ...user.userProfile,
          fullName: buildFullName(
            user.userProfile.firstName,
            user.userProfile.lastName,
          ),
        }
      : null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      profile,
    };
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  async getCurrentUser(
    @CurrentUser() currentUser: AccessTokenPayload,
  ): Promise<CurrentUserResponseDto> {
    const user = await this.usersService.findCurrentUserById(currentUser.sub);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapCurrentUserResponse(user);
  }

  @Patch('me')
  @UseGuards(AccessTokenGuard)
  async updateCurrentUser(
    @CurrentUser() currentUser: AccessTokenPayload,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<CurrentUserResponseDto> {
    const hasProfileUpdate = Object.values(updateProfileDto).some(
      (value) => value !== undefined,
    );

    if (!hasProfileUpdate) {
      throw new BadRequestException('At least one profile field is required');
    }

    const user = await this.usersService.updateCurrentUserProfile(
      currentUser.sub,
      updateProfileDto,
    );
    return this.mapCurrentUserResponse(user);
  }

  @Put('me/avatar')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: MAX_USER_AVATAR_SIZE_BYTES,
      },
    }),
  )
  async updateCurrentUserAvatar(
    @CurrentUser() currentUser: AccessTokenPayload,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: USER_AVATAR_FILE_TYPE_PATTERN,
        })
        .addMaxSizeValidator({
          maxSize: MAX_USER_AVATAR_SIZE_BYTES,
        })
        .build({
          fileIsRequired: true,
        }),
    )
    avatar: Express.Multer.File,
  ): Promise<CurrentUserResponseDto> {
    const user = await this.usersService.updateCurrentUserAvatar(
      currentUser.sub,
      avatar.buffer,
    );

    return this.mapCurrentUserResponse(user);
  }
}
