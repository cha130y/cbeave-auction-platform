"use client";

import { publicEnv } from "@/config/public-env";
import {
  getAccessToken,
  setAccessToken,
} from "./access-token.store";
import { ApiError } from "./api-error";

const apiBaseUrl = publicEnv.NEXT_PUBLIC_API_URL.replace(/\/+$/, "");

type ApiRequestInit = RequestInit & {
  retryUnauthorized?: boolean;
};

type RefreshResponse = {
  accessToken?: unknown;
};

let refreshRequest: Promise<string> | null = null;

function createUrl(path: string): string {
  return `${apiBaseUrl}/${path.replace(/^\/+/, "")}`;
}

function createHeaders(init: RequestInit): Headers {
  const headers = new Headers(init.headers);
  const token = getAccessToken();
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;

  if (init.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

async function requestAccessTokenRefresh(): Promise<string> {
  const response = await fetch(createUrl("/auth/refresh"), {
    credentials: "include",
    method: "POST",
  });

  if (!response.ok) {
    setAccessToken(null);
    throw await ApiError.fromResponse(response);
  }

  const payload = (await response.json()) as RefreshResponse;

  if (typeof payload.accessToken !== "string" || !payload.accessToken) {
    setAccessToken(null);
    throw new ApiError(502, "The API returned an invalid refresh response");
  }

  setAccessToken(payload.accessToken);

  return payload.accessToken;
}

export function refreshAccessToken(): Promise<string> {
  refreshRequest ??= requestAccessTokenRefresh().finally(() => {
    refreshRequest = null;
  });

  return refreshRequest;
}

export async function apiRequest<T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> {
  const { retryUnauthorized = true, ...requestInit } = init;
  const executeRequest = (): Promise<Response> =>
    fetch(createUrl(path), {
      ...requestInit,
      cache: requestInit.cache ?? "no-store",
      credentials: "include",
      headers: createHeaders(requestInit),
    });

  let response = await executeRequest();

  if (response.status === 401 && retryUnauthorized) {
    try {
      await refreshAccessToken();
      response = await executeRequest();
    } catch {
      // Preserve the protected endpoint's unauthorized response.
    }
  }

  if (!response.ok) {
    throw await ApiError.fromResponse(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
