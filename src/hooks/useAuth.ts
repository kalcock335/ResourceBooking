'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  roles: string[];
}

interface Session {
  user: User;
  expires: string;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await apiClient<Session>('/api/auth/session');
        if (data && data.user) {
          setSession(data);
          setStatus('authenticated');
        } else {
          setSession(null);
          setStatus('unauthenticated');
        }
      } catch (error) {
        console.error('Session check failed:', error);
        setSession(null);
        setStatus('unauthenticated');
      }
    };

    checkSession();
  }, []);

  return {
    data: session,
    status,
  };
}

export function signIn() {
  window.location.href = '/auth/signin';
}

export function signOut() {
  apiClient('/api/auth/signout', { method: 'POST' })
    .then(() => {
      window.location.href = '/auth/signin';
    })
    .catch(console.error);
} 