import { ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface Player {
  id: string;
  name: string;
  rank: number;
  points: number;
  change: string;
  level: 'pro' | 'advanced' | 'intermediate' | 'beginner';
}

interface TopPlayersProps {
  players: Player[];
  t: {
    title: string;
    subtitle: string;
    viewAll: string;
    level: {
      pro: string;
      advanced: string;
      intermediate: string;
      beginner: string;
    };
    points: string;
  };
}

export default function TopPlayers({ players, t }: TopPlayersProps) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'from-amber-500 to-orange-500';
    if (rank === 2) return 'from-slate-400 to-slate-500';
    return 'from-amber-700 to-amber-800';
  };

  return (
    <section id="rankings" className="py-20 px-6 bg-slate-900/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-4">
          <div>
            <h2 className="text-4xl font-bold mb-2">{t.title}</h2>
            <p className="text-slate-400">{t.subtitle}</p>
          </div>
          <Link
            href="/rankings"
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors flex items-center gap-2"
          >
            {t.viewAll}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {players.map((player) => (
            <div
              key={player.id}
              className="p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg bg-gradient-to-br ${getRankColor(player.rank)}`}
                  >
                    #{player.rank}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{player.name}</h3>
                    <span className="text-sm text-slate-400">{t.level[player.level]}</span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-500/10 text-green-400 text-sm font-medium rounded-full border border-green-500/20">
                  {player.change}
                </span>
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800">
                <span className="text-slate-400 text-sm">{t.points}</span>
                <span className="text-2xl font-bold text-indigo-400">{player.points}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
