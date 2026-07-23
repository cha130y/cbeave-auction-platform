import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { MessageResponseDto } from '../common/dto/message-response.dto';
import { ConfigService } from '@nestjs/config';
import { EnvVariable } from '../config/env.validation';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<EnvVariable, true>,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<MessageResponseDto> {
    await this.authService.register(registerDto);

    return { message: 'Registered successfully' };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    //HTTP response access
    //passthrough : modify headers or cookies ; ex ==> response.cookie(...);
    //Response is the Express response object. It is needed to add the refresh-token cookie
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(loginDto);

    const isProduction =
      this.configService.get('NODE_ENV', { infer: true }) === 'production';

    response.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/auth/refresh',
      expires: result.refreshTokenExpiresAt,
    });

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }
}
