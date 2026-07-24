import z from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535),
  DATABASE_URL: z.url(),
  ACCESS_TOKEN_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive(),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive(),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  WEB_APP_URL: z.url(),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CALLBACK_URL: z.url(),

  FACEBOOK_APP_ID: z.string().min(1),
  FACEBOOK_APP_SECRET: z.string().min(1),
  FACEBOOK_CALLBACK_URL: z.url(),
  FACEBOOK_GRAPH_API_VERSION: z.string().regex(/^v\d+\.\d+$/),
});

export function validateEnv(config: Record<string, unknown>): EnvVariable {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => {
        const field = issue.path.join('.') || 'environment';
        return `${field} : ${issue.message}`;
      })
      .join('; ');

    throw new Error(`Environment validation failed : ${problems}`);
  }
  return parsed.data;
}

export type EnvVariable = z.infer<typeof envSchema>;
