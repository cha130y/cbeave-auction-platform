import { describe, expect, it } from 'vitest';

import {
  loginCredentialsSchema,
  registerCredentialsSchema,
} from './auth.schemas';

describe('loginCredentialsSchema', () => {
  it('accepts valid credentials and trims the email', () => {
    const result = loginCredentialsSchema.parse({
      email: '  bidder@example.com  ',
      password: 'Secure123!',
    });

    expect(result).toEqual({
      email: 'bidder@example.com',
      password: 'Secure123!',
    });
  });

  it('rejects an invalid email address', () => {
    const result = loginCredentialsSchema.safeParse({
      email: 'invalid-email',
      password: 'Secure123!',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain(
        'Enter a valid email address',
      );
    }
  });

  it('requires a password', () => {
    const result = loginCredentialsSchema.safeParse({
      email: 'bidder@example.com',
      password: '',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password is required',
      );
    }
  });
});

describe('registerCredentialsSchema', () => {
  const validRegistration = {
    firstName: 'Frontend',
    lastName: '',
    displayName: 'FrontendTester',
    email: 'frontend@example.com',
    password: 'Secure123!',
    confirmPassword: 'Secure123!',
  };

  it('accepts registration without a last name', () => {
    const result = registerCredentialsSchema.safeParse(validRegistration);

    expect(result.success).toBe(true);
  });

  it('trims profile and email fields', () => {
    const result = registerCredentialsSchema.parse({
      ...validRegistration,
      firstName: '  Frontend  ',
      lastName: '  Tester  ',
      displayName: '  FrontendTester  ',
      email: '  frontend@example.com  ',
    });

    expect(result.firstName).toBe('Frontend');
    expect(result.lastName).toBe('Tester');
    expect(result.displayName).toBe('FrontendTester');
    expect(result.email).toBe('frontend@example.com');
  });

  it('rejects passwords that do not match', () => {
    const result = registerCredentialsSchema.safeParse({
      ...validRegistration,
      confirmPassword: 'Different123!',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        'Passwords do not match',
      );
    }
  });

  it('requires a password of at least eight characters', () => {
    const result = registerCredentialsSchema.safeParse({
      ...validRegistration,
      password: 'short',
      confirmPassword: 'short',
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Use at least 8 characters',
      );
    }
  });
});
