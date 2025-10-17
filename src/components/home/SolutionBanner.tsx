interface SolutionBannerProps {
  t: {
    title: string;
    subtitle: string;
  };
}

export default function SolutionBanner({ t }: SolutionBannerProps) {
  return (
    <section className="py-12 px-6 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 border-y border-indigo-500/20">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-3">{t.title}</h2>
        <p className="text-xl text-slate-400">{t.subtitle}</p>
      </div>
    </section>
  );
}
