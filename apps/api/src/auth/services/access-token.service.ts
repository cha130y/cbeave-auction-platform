import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AccessTokenPayload } from '../types/access-token-payload.type';

@Injectable()
export class AccessTokenService {
  constructor(private readonly jwtService: JwtService) {}

  sign(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }

  verify(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(token);
  }
}
