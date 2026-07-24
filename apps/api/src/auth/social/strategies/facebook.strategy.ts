import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import {
  Profile as FacebookProfile,
  Strategy as FacebookPassportStrategy,
} from 'passport-facebook';
import { EnvVariable } from '../../../config/env.validation';
import { SocialProfile } from '../types/social-profile.type';
import { AuthProvider } from '../../../generated/prisma/enums';

@Injectable()
export class FacebookStrategy extends PassportStrategy(
  FacebookPassportStrategy,
  'facebook',
) {
  constructor(configService: ConfigService<EnvVariable, true>) {
    super({
      clientID: configService.get('FACEBOOK_APP_ID', { infer: true }),
      clientSecret: configService.get('FACEBOOK_APP_SECRET', { infer: true }),
      callbackURL: configService.get('FACEBOOK_CALLBACK_URL', { infer: true }),
      graphAPIVersion: configService.get('FACEBOOK_GRAPH_API_VERSION', {
        infer: true,
      }),
      scope: ['email', 'public_profile'],
      profileFields: ['id', 'displayName', 'name', 'emails', 'photos'],
      enableProof: true,
    });
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: FacebookProfile,
  ): SocialProfile {
    void accessToken;
    void refreshToken;

    const facebookEmail = profile.emails?.[0]?.value?.trim().toLowerCase();

    if (!facebookEmail) {
      throw new UnauthorizedException('Facebook account must provide an email');
    }

    const firstName =
      profile.name?.givenName?.trim() ||
      profile.displayName.trim() ||
      facebookEmail.split('@')[0];

    const lastName = profile.name?.familyName?.trim() || null;
    const displayName =
      profile.displayName.trim() ||
      [firstName, lastName].filter(Boolean).join(' ');

    return {
      provider: AuthProvider.FACEBOOK,
      providerAccountId: profile.id,
      email: facebookEmail,
      emailVerified: false,
      firstName,
      lastName,
      displayName,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    };
  }
}
