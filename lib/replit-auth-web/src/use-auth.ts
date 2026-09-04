import { useCallback, useEffect, useState } from 'react';
export interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}


interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/user', { credentials: 'include' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ user: AuthUser | null }>;
      })
      .then((data) => {
        if (!cancelled) {
          setUser(data.user ?? null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || '로그인에 실패했습니다.');
    }
    const data = (await response.json()) as { user: AuthUser };
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).finally(() => {
      setUser(null);
      window.location.href = '/';
    });
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
}
