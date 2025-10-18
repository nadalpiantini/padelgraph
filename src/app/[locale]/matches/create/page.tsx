/**
 * Create Match Page
 *
 * Form to create a new padel match with date, time, and location.
 */

// import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { CalendarDays, ChevronLeft } from 'lucide-react';
import Image from 'next/image';

export default async function CreateMatchPage() {
  // const t = await getTranslations('matches');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header with Branding */}
      <header className="border-b border-slate-800/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image
                src="/images/branding/padelgraph_logo_01.png"
                alt="PadelGraph Logo"
                width={100}
                height={100}
                className="rounded-xl"
                priority
              />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <CalendarDays className="h-8 w-8 text-indigo-500" />
            <h1 className="text-3xl font-bold">Crear Partido</h1>
          </div>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-slate-800/30 rounded-lg p-8 border border-slate-700/50">
          <div className="text-center py-12">
            <CalendarDays className="h-16 w-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-2">
              Creación de partidos próximamente
            </h3>
            <p className="text-slate-400 mb-6">
              Pronto podrás crear y organizar partidos de pádel con otros jugadores.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
            >
              Volver al Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
