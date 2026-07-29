import {
  CurrentUser,
  currentUserSchema,
} from '@/features/auth/schemas/auth.schemas';
import { UpdateProfileInput } from '@/features/profile/schemas/profile.schemas';
import { apiRequest } from '@/lib/api/api-client';

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<CurrentUser> {
  return currentUserSchema.parse(
    await apiRequest<unknown>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
}
