import { Target, Users, BarChart3, Trophy, Globe, Heart } from 'lucide-react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us | PadelGraph',
  description: 'Learn about PadelGraph - The ultimate social network for padel players',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/branding/padelgraph_logo_01.png"
              alt="PadelGraph Logo"
              width={100}
              height={100}
              className="rounded-xl"
              priority
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/rankings"
              className="text-slate-300 hover:text-white transition-colors"
            >
              Rankings
            </Link>
            <Link
              href="/auth"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-all"
            >
              Join Network
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6">
            <Heart className="w-4 h-4 text-indigo-400" />
            <span className="text-sm text-indigo-300">Built for Padel Lovers</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            About PadelGraph
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            We&apos;re building the ultimate social network for padel players around the
            world. Connect, compete, and level up your game.
          </p>
        </div>

        {/* Mission Section */}
        <div className="grid md:grid-cols-2 gap-12 mb-20">
          <div className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 rounded-2xl p-8">
            <Target className="w-12 h-12 mb-4 text-indigo-400" />
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-slate-300 text-lg">
              To make padel more accessible, competitive, and social by connecting
              players of all levels through technology. We believe everyone should
              be able to find matches, track progress, and grow their padel network.
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/20 rounded-2xl p-8">
            <Globe className="w-12 h-12 mb-4 text-purple-400" />
            <h2 className="text-3xl font-bold mb-4">Our Vision</h2>
            <p className="text-slate-300 text-lg">
              To become the global hub for the padel community, where players
              discover opportunities, clubs manage operations seamlessly, and the
              sport grows through data-driven insights and social connections.
            </p>
          </div>
        </div>

        {/* What We Offer */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold text-center mb-12">What We Offer</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <BarChart3 className="w-10 h-10 mb-4 text-indigo-400" />
              <h3 className="text-xl font-bold mb-3">Real-Time Rankings</h3>
              <p className="text-slate-400">
                Track your performance with live ELO ratings and leaderboards.
                Compare yourself against players at your level and see your
                progress over time.
              </p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <Users className="w-10 h-10 mb-4 text-indigo-400" />
              <h3 className="text-xl font-bold mb-3">Social Network</h3>
              <p className="text-slate-400">
                Connect with players nearby, find matches at your skill level,
                share highlights, and build your padel community.
              </p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <Trophy className="w-10 h-10 mb-4 text-indigo-400" />
              <h3 className="text-xl font-bold mb-3">Tournaments</h3>
              <p className="text-slate-400">
                Organize and participate in tournaments with multiple formats:
                Americano, Mexicano, Round Robin, Swiss, and more.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-12 mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">
            Growing the Padel Community
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2 text-indigo-400">1K+</div>
              <div className="text-slate-400">Active Players</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2 text-purple-400">5K+</div>
              <div className="text-slate-400">Matches Played</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold mb-2 text-pink-400">50+</div>
              <div className="text-slate-400">Partner Clubs</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="inline-block bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 rounded-2xl p-12">
            <Trophy className="w-16 h-16 mx-auto mb-6 text-indigo-400" />
            <h2 className="text-4xl font-bold mb-6">Join the Movement</h2>
            <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
              Become part of the fastest-growing padel community. Connect with
              players, compete in tournaments, and level up your game.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/auth?mode=signup"
                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                Get Started Free
                <Trophy className="w-5 h-5" />
              </Link>
              <Link
                href="/rankings"
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
              >
                View Rankings
                <BarChart3 className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-20 text-center">
          <h3 className="text-2xl font-bold mb-4">Questions?</h3>
          <p className="text-slate-400 mb-6">
            We&apos;d love to hear from you. Reach out to our team anytime.
          </p>
          <a
            href="mailto:hello@padelgraph.com"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            hello@padelgraph.com
          </a>
        </div>
      </main>
    </div>
  );
}
