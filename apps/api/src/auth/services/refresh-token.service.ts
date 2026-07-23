import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

@Injectable()
export class RefreshTokenService {
  //generate a secure refresh token for the client
  generate(): string {
    return randomBytes(32).toString('base64url');
  }

  //create the safe database representation
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
