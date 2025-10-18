'use client';

import { useEffect, useState } from 'react';
import { Clock, Zap } from 'lucide-react';

interface TrialBadgeProps {
  trialEndDate?: string | null;
  tier?: 'free' | 'pro' | 'premium';
}

export default function TrialBadge({ trialEndDate, tier = 'free' }: TrialBadgeProps) {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!trialEndDate) return;

    const calculateDaysLeft = () => {
      const now = new Date();
      const endDate = new Date(trialEndDate);
      const diffTime = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        setIsExpired(true);
        setDaysLeft(0);
      } else {
        setIsExpired(false);
        setDaysLeft(diffDays);
      }
    };

    calculateDaysLeft();
    const interval = setInterval(calculateDaysLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [trialEndDate]);

  // Don't show badge if not on trial or no trial end date
  if (!trialEndDate || tier !== 'free') return null;

  const getUrgencyColor = () => {
    if (isExpired) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (daysLeft !== null && daysLeft <= 3) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  };

  const getMessage = () => {
    if (isExpired) return 'Trial Expired';
    if (daysLeft === 0) return 'Trial Ends Today';
    if (daysLeft === 1) return '1 Day Left in Trial';
    return `${daysLeft} Days Left in Trial`;
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ${getUrgencyColor()}`}>
      {isExpired ? (
        <Clock className="w-4 h-4" />
      ) : (
        <Zap className="w-4 h-4" />
      )}
      <span>{getMessage()}</span>
    </div>
  );
}
