'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
}

export function useAuth(redirectTo?: string): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (mounted) {
          if (error) {
            setError(error);
          } else {
            setUser(user);
          }
          setLoading(false);

          // Redirect if no user and redirectTo is specified
          if (!user && redirectTo) {
            router.push(redirectTo);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
          setLoading(false);
        }
      }
    }

    // Load user on mount
    loadUser();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setUser(session?.user || null);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            if (redirectTo) {
              router.push(redirectTo);
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [redirectTo, router, supabase]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err as Error);
    }
  };

  return { user, loading, error, signOut };
}

// Server-side auth check helper
export async function requireAuth(redirectTo: string = '/auth') {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const { redirect } = await import('next/navigation');
    redirect(redirectTo);
  }

  return user;
}