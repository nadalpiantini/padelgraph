'use client';

/**
 * Reactivate Subscription Button Component
 * Allows users to reactivate a cancelled subscription before period end
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

interface ReactivateButtonProps {
  periodEnd?: string;
  className?: string;
}

export function ReactivateButton({ periodEnd, className = '' }: ReactivateButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReactivate = async () => {
    if (!confirm('Are you sure you want to reactivate your subscription?')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate subscription');
      }

      // Show success message and refresh
      alert('Subscription reactivated successfully! Your plan will continue renewing.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate subscription');
      alert('Error: ' + (err instanceof Error ? err.message : 'Failed to reactivate subscription'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <button
        onClick={handleReactivate}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        {isLoading ? 'Reactivating...' : 'Reactivate Subscription'}
      </button>

      {periodEnd && (
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Your subscription is currently set to cancel on {periodEnd}. Reactivating will
          continue your plan and resume billing.
        </p>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
