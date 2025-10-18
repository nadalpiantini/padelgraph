import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import TravelDashboardClient from './TravelDashboardClient';
import { getTranslations } from 'next-intl/server';

export const metadata = {
  title: 'Travel Mode - Padelgraph',
  description: 'Find padel players and matches while traveling',
};

export default async function TravelPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login?redirect=/travel');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('user_profile')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/dashboard');
  }

  // Get translations for travel mode panel
  const t = await getTranslations('travel');

  const travelTranslations = {
    title: t('title'),
    subtitle: t('subtitle'),
    destination: t('destination'),
    destinationPlaceholder: t('destinationPlaceholder'),
    startDate: t('startDate'),
    endDate: t('endDate'),
    preferences: t('preferences'),
    level: t('level'),
    format: t('format'),
    save: t('save'),
    cancel: t('cancel'),
    suggestions: t('suggestions'),
    noSuggestions: t('noSuggestions'),
    travelModeActive: t('travelModeActive'),
    errors: {
      destination: t('errors.destination'),
      dates: t('errors.dates'),
      invalidDates: t('errors.invalidDates'),
    },
  };

  return (
    <TravelDashboardClient
      userId={user.id}
      profile={profile}
      translations={travelTranslations}
    />
  );
}
