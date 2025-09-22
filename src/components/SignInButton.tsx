'use client';

import { useState } from "react";
import { useSession } from '@/hooks/useAuth';
import { apiClient } from '../lib/apiClient';

export default function SignInButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { data: session, status } = useSession();

  const handleSignIn = () => {
    window.location.href = '/auth/signin';
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await apiClient('/api/auth/signout', { method: 'POST' });
      window.location.href = '/auth/signin';
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return null;
  }

  if (session?.user) {
    // Show avatar with initials and sign out
    const initials = session.user.name
      ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : '?';
    return (
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg" title={session.user.name || ''}>
          {initials}
        </div>
        <button
          onClick={handleSignOut}
          disabled={isLoading}
          className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    );
  }

  // Not signed in
  return (
    <button
      onClick={handleSignIn}
      className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
    >
      Sign In
    </button>
  );
} 