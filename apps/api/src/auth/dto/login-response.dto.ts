import { UserRole } from '../../generated/prisma/enums';

export class LoginProfileResponseDto {
  firstName: string;
  lastName: string | null;
  displayName: string;
  avatarUrl: string | null;
}

export class LoginUserResponseDto {
  id: string;
  email: string;
  role: UserRole;
  profile: LoginProfileResponseDto | null;
}

export class LoginResponseDto {
  accessToken: string;
  user: LoginUserResponseDto;
}
