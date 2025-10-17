import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

import Navigation from '@/components/home/Navigation';
import Hero from '@/components/home/Hero';
import SolutionBanner from '@/components/home/SolutionBanner';
import Features from '@/components/home/Features';
import TopPlayers from '@/components/home/TopPlayers';
import HowItWorks from '@/components/home/HowItWorks';
import Stats from '@/components/home/Stats';
import FinalCTA from '@/components/home/FinalCTA';
import Footer from '@/components/home/Footer';

export const metadata: Metadata = {
  title: 'PadelGraph - Connect, Compete, Level Up | Padel Social Network',
  description:
    'Join thousands of padel players. Track rankings, find matches at your level, manage tournaments, and connect with the padel community. Real-time rankings, GPS check-in, and court booking system.',
  keywords: [
    'padel',
    'tournament',
    'social network',
    'rankings',
    'court booking',
    'americano',
    'mexicano',
  ],
  openGraph: {
    title: 'PadelGraph - The Ultimate Padel Social Network',
    description:
      'Connect with players, track performance, join tournaments. Your complete padel hub.',
    type: 'website',
    locale: 'en_US',
    siteName: 'PadelGraph',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PadelGraph - Play Better. Connect Smarter.',
    description: 'The ultimate social network for padel players.',
  },
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params; // Consume params to satisfy Next.js

  const t = await getTranslations('homepage');

  // Fetch top players data from API
  let players = [];
  try {
    const playersResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/rankings?limit=3`,
      {
        cache: 'no-store', // Real-time data
        // Alternatively use: next: { revalidate: 300 } for 5-min cache
      }
    );
    if (playersResponse.ok) {
      const data = await playersResponse.json();
      players = data.players || [];
    }
  } catch (error) {
    console.error('Failed to fetch rankings:', error);
    // Fallback to empty array - page still loads
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <Navigation
        t={{
          features: t('nav.features'),
          rankings: t('nav.rankings'),
          howItWorks: t('nav.howItWorks'),
          login: t('nav.login'),
          start: t('nav.start'),
        }}
      />

      <main>
        <Hero
          t={{
            title: t('hero.title'),
            subtitle: t('hero.subtitle'),
            cta1: t('hero.cta1'),
            cta2: t('hero.cta2'),
          }}
        />

        <SolutionBanner
          t={{
            title: t('solution.title'),
            subtitle: t('solution.subtitle'),
          }}
        />

        <Features
          t={{
            rankings: {
              title: t('features.rankings.title'),
              description: t('features.rankings.description'),
            },
            connect: {
              title: t('features.connect.title'),
              description: t('features.connect.description'),
            },
            social: {
              title: t('features.social.title'),
              description: t('features.social.description'),
            },
            management: {
              title: t('features.management.title'),
              description: t('features.management.description'),
            },
            tournaments: {
              title: t('features.tournaments.title'),
              description: t('features.tournaments.description'),
            },
            analytics: {
              title: t('features.analytics.title'),
              description: t('features.analytics.description'),
            },
          }}
        />

        <TopPlayers
          players={players || []}
          t={{
            title: t('topPlayers.title'),
            subtitle: t('topPlayers.subtitle'),
            viewAll: t('topPlayers.viewAll'),
            level: {
              pro: t('topPlayers.level.pro'),
              advanced: t('topPlayers.level.advanced'),
              intermediate: t('topPlayers.level.intermediate'),
              beginner: t('topPlayers.level.beginner'),
            },
            points: t('topPlayers.points'),
          }}
        />

        <HowItWorks
          t={{
            title: t('howItWorks.title'),
            subtitle: t('howItWorks.subtitle'),
            step1: {
              title: t('howItWorks.step1.title'),
              description: t('howItWorks.step1.description'),
            },
            step2: {
              title: t('howItWorks.step2.title'),
              description: t('howItWorks.step2.description'),
            },
            step3: {
              title: t('howItWorks.step3.title'),
              description: t('howItWorks.step3.description'),
            },
          }}
        />

        <Stats
          t={{
            players: t('stats.players'),
            matches: t('stats.matches'),
            clubs: t('stats.clubs'),
          }}
        />

        <FinalCTA
          t={{
            title: t('cta.title'),
            subtitle: t('cta.subtitle'),
            button1: t('cta.button1'),
            button2: t('cta.button2'),
          }}
        />
      </main>

      <Footer
        t={{
          terms: t('footer.terms'),
          privacy: t('footer.privacy'),
          contact: t('footer.contact'),
          docs: t('footer.docs'),
          rights: t('footer.rights'),
        }}
      />
    </div>
  );
}
