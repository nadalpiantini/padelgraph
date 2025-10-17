'use client';

import { useEffect, useState, useRef } from 'react';

interface StatsProps {
  t: {
    players: string;
    matches: string;
    clubs: string;
  };
}

export default function Stats({ t }: StatsProps) {
  const [stats, setStats] = useState({ players: 0, matches: 0, clubs: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000; // 2 seconds
    const steps = 60;
    const stepDuration = duration / steps;

    const targets = { players: 2000, matches: 5000, clubs: 500 };
    const increments = {
      players: targets.players / steps,
      matches: targets.matches / steps,
      clubs: targets.clubs / steps,
    };

    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep >= steps) {
        setStats(targets);
        clearInterval(interval);
        return;
      }

      setStats({
        players: Math.floor(increments.players * currentStep),
        matches: Math.floor(increments.matches * currentStep),
        clubs: Math.floor(increments.clubs * currentStep),
      });

      currentStep++;
    }, stepDuration);

    return () => clearInterval(interval);
  }, [isVisible]);

  return (
    <section ref={sectionRef} className="py-20 px-6 bg-slate-900/30">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="p-8">
            <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent mb-3">
              {stats.players.toLocaleString()}+
            </div>
            <div className="text-xl text-slate-400">{t.players}</div>
          </div>
          <div className="p-8">
            <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent mb-3">
              {stats.matches.toLocaleString()}+
            </div>
            <div className="text-xl text-slate-400">{t.matches}</div>
          </div>
          <div className="p-8">
            <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent mb-3">
              {stats.clubs}+
            </div>
            <div className="text-xl text-slate-400">{t.clubs}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
