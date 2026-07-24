import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  Profile as GoogleProfile,
  Strategy as GooglePassportStrategy,
} from 'passport-google-oauth20';
import { EnvVariable } from '../../../config/env.validation';
import { SocialProfile } from '../types/social-profile.type';
import { AuthProvider } from '../../../generated/prisma/enums';

@Injectable()
export class GoogleStrategy extends PassportStrategy(
  GooglePassportStrategy,
  'google',
) {
  constructor(configService: ConfigService<EnvVariable, true>) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID', { infer: true }),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET', { infer: true }),
      callbackURL: configService.get('GOOGLE_CALLBACK_URL', { infer: true }),
      scope: ['email', 'profile'],
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
  ): SocialProfile {
    //CBeave only needs Google to confirm the user’s identity. It does not need to call Google APIs afterward, so these tokens should not be stored
    void accessToken;
    void refreshToken;
    const verifiedEmail = profile.emails?.find(
      (email) => email.verified,
    )?.value;

    if (!verifiedEmail) {
      throw new UnauthorizedException(
        'Google account must provide a verified email',
      );
    }

    const email = verifiedEmail.trim().toLowerCase();
    const firstName =
      profile.name?.givenName?.trim() ||
      profile.displayName.trim() ||
      email.split('@')[0];

    const lastName = profile.name?.familyName?.trim() || null;
    const displayName =
      profile.displayName.trim() ||
      [firstName, lastName].filter(Boolean).join(' ');

    return {
      provider: AuthProvider.GOOGLE,
      providerAccountId: profile.id,
      email,
      emailVerified: true,
      firstName,
      lastName,
      displayName,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
  }
}
