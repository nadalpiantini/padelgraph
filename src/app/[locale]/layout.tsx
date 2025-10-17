import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import "../globals.css";
import ClientErrorSuppressor from "@/components/ClientErrorSuppressor";
import { AnalyticsProvider } from '@/lib/providers/AnalyticsProvider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Padelgraph",
  description: "Padelgraph - Your padel social network",
  icons: {
    icon: [
      { url: '/images/branding/pg_logo_minimal_01.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/branding/pg_logo_minimal_01.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/images/branding/pg_logo_minimal_01.png',
    shortcut: '/images/branding/pg_logo_minimal_01.png',
  },
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ClientErrorSuppressor />
        <AnalyticsProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
