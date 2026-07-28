"use client";

import {
  currentUserSchema,
  loginResponseSchema,
  messageResponseSchema,
  type CurrentUser,
  type LoginCredentials,
  type RegisterCredentials,
} from "@/features/auth/schemas/auth.schemas";
import { publicEnv } from "@/config/public-env";
import {
  apiRequest,
  refreshAccessToken,
} from "@/lib/api/api-client";

export async function login(
  credentials: LoginCredentials,
): Promise<string> {
  const response = loginResponseSchema.parse(
    await apiRequest<unknown>("/auth/login", {
      body: JSON.stringify(credentials),
      method: "POST",
      retryUnauthorized: false,
    }),
  );

  return response.accessToken;
}

export async function restoreAccessToken(): Promise<string> {
  return refreshAccessToken();
}

export async function getCurrentUser(): Promise<CurrentUser> {
  return currentUserSchema.parse(await apiRequest<unknown>("/users/me"));
}

export async function logout(): Promise<void> {
  await apiRequest<void>("/auth/logout", {
    method: "POST",
    retryUnauthorized: false,
  });
}

export async function register(
  credentials: RegisterCredentials,
): Promise<string> {
  const response = messageResponseSchema.parse(
    await apiRequest<unknown>("/auth/register", {
      body: JSON.stringify(credentials),
      method: "POST",
      retryUnauthorized: false,
    }),
  );

  return response.message;
}

export function getSocialLoginUrl(
  provider: "google" | "facebook",
): string {
  const apiBaseUrl = publicEnv.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");

  return `${apiBaseUrl}/auth/${provider}`;
}
