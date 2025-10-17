'use client';

import { BarChart3 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';

interface HeroProps {
  t: {
    title: string;
    subtitle: string;
    cta1: string;
    cta2: string;
  };
}

export default function Hero({ t }: HeroProps) {
  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Image
              src="/images/branding/padelgraph_logo_01.png"
              alt="PadelGraph Logo"
              width={300}
              height={300}
              className="w-48 h-48 md:w-64 md:h-64 object-contain rounded-xl"
              priority
            />
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent leading-tight">
            {t.title}
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            {t.subtitle}
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/rankings"
              className="group px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
              aria-label="View player rankings and leaderboards"
            >
              {t.cta1}
              <BarChart3 className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Tagline */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 text-lg">Your Padel Hub Awaits</p>
        </div>
      </div>
    </section>
  );
}
