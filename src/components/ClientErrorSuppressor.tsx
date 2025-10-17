'use client';

import { useEffect } from 'react';
import { suppressExtensionErrors } from '@/lib/suppress-extension-errors';

export default function ClientErrorSuppressor() {
  useEffect(() => {
    // Only run in development mode to help with debugging
    if (process.env.NODE_ENV === 'development') {
      suppressExtensionErrors();
    }
  }, []);

  // This component doesn't render anything
  return null;
}