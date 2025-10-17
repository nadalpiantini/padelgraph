import { BarChart3, MapPin, Camera, Calendar, Trophy, TrendingUp } from 'lucide-react';

interface FeaturesProps {
  t: {
    rankings: { title: string; description: string };
    connect: { title: string; description: string };
    social: { title: string; description: string };
    management: { title: string; description: string };
    tournaments: { title: string; description: string };
    analytics: { title: string; description: string };
  };
}

const featureIcons = [BarChart3, MapPin, Camera, Calendar, Trophy, TrendingUp];
const featureColors = [
  'from-amber-500 to-orange-500',
  'from-indigo-500 to-purple-500',
  'from-pink-500 to-rose-500',
  'from-green-500 to-emerald-500',
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-purple-500',
];

export default function Features({ t }: FeaturesProps) {
  const features = [
    t.rankings,
    t.connect,
    t.social,
    t.management,
    t.tournaments,
    t.analytics,
  ];

  return (
    <section id="features" className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => {
            const Icon = featureIcons[idx];
            return (
              <div
                key={idx}
                className="group p-8 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-slate-700 transition-all hover:-translate-y-1"
              >
                <div
                  className={`w-16 h-16 bg-gradient-to-br ${featureColors[idx]} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg`}
                >
                  <Icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
