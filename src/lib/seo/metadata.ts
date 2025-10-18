/**
 * SEO Metadata Utilities
 * Sprint 5 Phase 4: Shared metadata configuration
 */

import { Metadata } from 'next';

const APP_NAME = 'PadelGraph';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://padelgraph.com';
const APP_DESCRIPTION =
  'The ultimate platform for padel players. Track your progress, find tournaments, connect with players, and level up your game with AI-powered insights.';

export const DEFAULT_METADATA: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: `${APP_NAME} - Track, Compete, Level Up`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  authors: [{ name: APP_NAME }],
  generator: 'Next.js',
  keywords: [
    'padel',
    'padel tennis',
    'padel rankings',
    'padel tournaments',
    'padel training',
    'sports analytics',
    'player network',
    'padel community',
    'padel stats',
    'competitive padel',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: APP_NAME,
    title: `${APP_NAME} - Track, Compete, Level Up`,
    description: APP_DESCRIPTION,
    images: [
      {
        url: `${APP_URL}/images/branding/og-image.png`,
        width: 1200,
        height: 630,
        alt: `${APP_NAME} - Padel Player Platform`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@padelgraph',
    creator: '@padelgraph',
    title: `${APP_NAME} - Track, Compete, Level Up`,
    description: APP_DESCRIPTION,
    images: [`${APP_URL}/images/branding/twitter-card.png`],
  },
  verification: {
    // Add when ready:
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
  alternates: {
    canonical: APP_URL,
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

/**
 * Generate page-specific metadata
 */
export function generatePageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const url = `${APP_URL}${path}`;
  const ogImage = image || `${APP_URL}/images/branding/og-image.png`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: url,
    },
  };
}

/**
 * Schema.org JSON-LD for Organization
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP_NAME,
    url: APP_URL,
    logo: `${APP_URL}/images/branding/padelgraph_logo_01.png`,
    description: APP_DESCRIPTION,
    sameAs: [
      // Add social media links when available
      // 'https://twitter.com/padelgraph',
      // 'https://facebook.com/padelgraph',
      // 'https://instagram.com/padelgraph',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@padelgraph.com',
    },
  };
}

/**
 * Schema.org JSON-LD for WebSite
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: APP_NAME,
    url: APP_URL,
    description: APP_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${APP_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/**
 * Schema.org JSON-LD for Tournament
 */
export function generateTournamentSchema(tournament: {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  maxParticipants: number;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: tournament.name,
    description: tournament.description,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    location: {
      '@type': 'Place',
      name: tournament.location,
    },
    organizer: {
      '@type': 'Organization',
      name: APP_NAME,
      url: APP_URL,
    },
    sport: 'Padel',
    url: `${APP_URL}/tournaments/${tournament.id}`,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  };
}
