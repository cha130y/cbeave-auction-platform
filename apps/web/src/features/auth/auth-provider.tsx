'use client';

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  restoreAccessToken,
} from '@/features/auth/api/auth.api';
import type {
  CurrentUser,
  LoginCredentials,
} from '@/features/auth/schemas/auth.schemas';
import { setAccessToken } from '@/lib/api/access-token.store';
import { disconnectAuctionSocket } from '@/lib/realtime/auction-socket';
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<CurrentUser>;
  restoreSession: () => Promise<void>;
  status: AuthStatus;
  user: CurrentUser | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

async function loadAuthenticatedUser(): Promise<CurrentUser> {
  await restoreAccessToken();

  return getCurrentUser();
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUser | null>(null);

  const restoreSession = useCallback(async (): Promise<void> => {
    try {
      const restoredUser = await loadAuthenticatedUser();

      setUser(restoredUser);
      setStatus('authenticated');
    } catch (error) {
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');

      throw error;
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    void loadAuthenticatedUser()
      .then((restoredUser) => {
        if (!isActive) {
          return;
        }

        setUser(restoredUser);
        setStatus('authenticated');
      })
      .catch(() => {
        setAccessToken(null);

        if (!isActive) {
          return;
        }

        setUser(null);
        setStatus('unauthenticated');
      });

    return () => {
      isActive = false;
    };
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<void> => {
      const token = await loginRequest(credentials);
      setAccessToken(token);

      try {
        const authenticatedUser = await getCurrentUser();
        setUser(authenticatedUser);
        setStatus('authenticated');
      } catch (error) {
        setAccessToken(null);
        throw error;
      }
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutRequest();
    } finally {
      disconnectAuctionSocket();
      setAccessToken(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<CurrentUser> => {
    const refreshedUser = await getCurrentUser();
    setUser(refreshedUser);

    return refreshedUser;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      login,
      logout,
      refreshUser,
      restoreSession,
      status,
      user,
    }),
    [login, logout, refreshUser, restoreSession, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
