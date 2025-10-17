'use client';

import { useState } from 'react';
import { Trophy, Globe, Menu, X } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useLocale } from 'next-intl';

interface NavigationProps {
  t: {
    features: string;
    rankings: string;
    howItWorks: string;
    login: string;
    start: string;
  };
}

export default function Navigation({ t }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'es' : 'en';
    router.replace(pathname, { locale: newLocale });
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <nav className="fixed top-0 w-full bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold">PadelGraph</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-300 hover:text-white transition-colors">
              {t.features}
            </a>
            <Link href="/rankings" className="text-slate-300 hover:text-white transition-colors">
              {t.rankings}
            </Link>
            <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors">
              {t.howItWorks}
            </a>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleLocale}
              className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-2 border border-slate-700 rounded-lg hover:border-slate-600"
              aria-label={`Switch to ${locale === 'en' ? 'Spanish' : 'English'}`}
            >
              <Globe className="w-4 h-4" />
              {locale === 'en' ? 'ES' : 'EN'}
            </button>
            <Link
              href="/auth"
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              {t.login}
            </Link>
            <Link
              href="/auth?mode=signup"
              className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
            >
              {t.start}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-300 hover:text-white transition-colors"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          <div className="absolute top-[73px] left-0 right-0 bg-slate-900 border-b border-slate-800 shadow-xl">
            <div className="px-6 py-6 space-y-4">
              <a
                href="#features"
                className="block text-slate-300 hover:text-white transition-colors py-2"
                onClick={closeMobileMenu}
              >
                {t.features}
              </a>
              <Link
                href="/rankings"
                className="block text-slate-300 hover:text-white transition-colors py-2"
                onClick={closeMobileMenu}
              >
                {t.rankings}
              </Link>
              <a
                href="#how-it-works"
                className="block text-slate-300 hover:text-white transition-colors py-2"
                onClick={closeMobileMenu}
              >
                {t.howItWorks}
              </a>
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <button
                  onClick={() => {
                    toggleLocale();
                    closeMobileMenu();
                  }}
                  className="w-full px-4 py-3 text-sm font-medium text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-2 border border-slate-700 rounded-lg hover:border-slate-600"
                  aria-label={`Switch to ${locale === 'en' ? 'Spanish' : 'English'}`}
                >
                  <Globe className="w-4 h-4" />
                  {locale === 'en' ? 'ES' : 'EN'}
                </button>
                <Link
                  href="/auth"
                  className="block w-full px-4 py-3 text-sm font-medium text-center text-slate-300 hover:text-white transition-colors border border-slate-700 rounded-lg"
                  onClick={closeMobileMenu}
                >
                  {t.login}
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="block w-full px-4 py-3 text-sm font-medium text-center bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                  onClick={closeMobileMenu}
                >
                  {t.start}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
