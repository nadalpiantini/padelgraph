import { Suspense } from 'react';
import DiscoverClient from './DiscoverClient';

export const metadata = {
  title: 'Discover Players | Padelgraph',
  description: 'Find and connect with padel players near you',
};

export default function DiscoverPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <DiscoverClient />
        </Suspense>
      </div>
    </main>
  );
}
