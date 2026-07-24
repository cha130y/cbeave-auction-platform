import { SocialProfile } from './social-profile.type';
import { Request } from 'express';

export type SocialAuthenticatedRequest = Request & {
  user: SocialProfile;
};
