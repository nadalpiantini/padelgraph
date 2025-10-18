'use client';

/**
 * Cancel Subscription Modal Component
 * Shows confirmation dialog before cancelling subscription
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionPlan: string;
  periodEnd?: string;
}

export function CancelModal({
  isOpen,
  onClose,
  subscriptionPlan,
  periodEnd,
}: CancelModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/subscriptions/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      // Show success message and refresh
      alert('Subscription cancelled successfully. Your plan will remain active until ' + periodEnd);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-neutral-900">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          disabled={isLoading}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <h2 className="mb-4 text-xl font-bold text-neutral-900 dark:text-white">
          Cancel Subscription
        </h2>

        {/* Content */}
        <div className="mb-6 space-y-4">
          <p className="text-neutral-700 dark:text-neutral-300">
            Are you sure you want to cancel your{' '}
            <span className="font-semibold">{subscriptionPlan}</span> plan?
          </p>

          <div className="rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> Your subscription will remain active until{' '}
              {periodEnd || 'the end of your billing period'}. After that, you'll be
              downgraded to the Free plan.
            </p>
          </div>

          <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
            <p>You'll lose access to:</p>
            <ul className="list-inside list-disc space-y-1 pl-2">
              <li>Unlimited tournaments</li>
              <li>Advanced analytics</li>
              <li>Priority support</li>
              <li>API access (Premium/Club)</li>
            </ul>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            disabled={isLoading}
          >
            Keep Subscription
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? 'Cancelling...' : 'Cancel Subscription'}
          </button>
        </div>
      </div>
    </div>
  );
}
