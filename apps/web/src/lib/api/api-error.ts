type ApiErrorPayload = {
  error?: unknown;
  message?: unknown;
  statusCode?: unknown;
};

function readMessage(payload: ApiErrorPayload | null): string | null {
  if (typeof payload?.message === "string") {
    return payload.message;
  }

  if (
    Array.isArray(payload?.message) &&
    payload.message.every((message) => typeof message === "string")
  ) {
    return payload.message.join(", ");
  }

  return null;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly code: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    const payload = await response
      .json()
      .then((value: unknown) => value as ApiErrorPayload)
      .catch(() => null);

    const message =
      readMessage(payload) ||
      response.statusText ||
      "The request could not be completed";
    const code = typeof payload?.error === "string" ? payload.error : null;

    return new ApiError(response.status, message, code);
  }
}
