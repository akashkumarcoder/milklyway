'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AuthProviderProps {
  children: React.ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      // If user is not authenticated and not on login page, redirect to login
      if (!user && pathname !== '/login') {
        router.push('/login');
      }
      // If user is authenticated and on login page, redirect to dashboard
      else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, loading, pathname, router]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
          <p className="text-lg text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and not on login page, don't render children
  if (!user && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}

