import { Trophy, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface FinalCTAProps {
  t: {
    title: string;
    subtitle: string;
    button1: string;
    button2: string;
  };
}

export default function FinalCTA({ t }: FinalCTAProps) {
  return (
    <section className="py-32 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="p-12 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20 rounded-3xl backdrop-blur-sm">
          <Trophy className="w-16 h-16 mx-auto mb-6 text-indigo-400" />
          <h2 className="text-4xl md:text-5xl font-bold mb-6">{t.title}</h2>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">{t.subtitle}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth?mode=signup"
              className="group px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
            >
              {t.button1}
              <Trophy className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </Link>
            <Link
              href="/about"
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2"
            >
              {t.button2}
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
