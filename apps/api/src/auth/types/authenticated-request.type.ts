import type { Request } from 'express';
import { AccessTokenPayload } from './access-token-payload.type';

export type AuthenticatedRequest = Request & {
  authUser: AccessTokenPayload;
};
