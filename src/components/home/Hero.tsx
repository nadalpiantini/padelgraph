'use client';

import { Users, BarChart3 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';

interface HeroProps {
  t: {
    badge: string;
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
              width={600}
              height={600}
              className="rounded-xl"
              priority
            />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6 animate-fade-in">
            <BarChart3 className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <span className="text-sm text-indigo-300">{t.badge}</span>
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

        {/* Hero Visual */}
        <div className="mt-20 relative">
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
            <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 p-8 backdrop-blur-sm">
              <div className="aspect-video bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl border border-indigo-500/20 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)]" />
                <div className="relative z-10 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/50">
                    <Users className="w-12 h-12" aria-hidden="true" />
                  </div>
                  <p className="text-slate-400 text-lg">Your Padel Hub Awaits</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
