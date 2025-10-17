import { Trophy } from 'lucide-react';
import { Link } from '@/i18n/routing';

interface FooterProps {
  t: {
    terms: string;
    privacy: string;
    contact: string;
    docs: string;
    rights: string;
  };
}

export default function Footer({ t }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="font-bold">PadelGraph</span>
          </div>

          <div className="flex flex-wrap gap-8 text-sm text-slate-400">
            <Link href="/terms" className="hover:text-white transition-colors">
              {t.terms}
            </Link>
            <Link href="/privacy" className="hover:text-white transition-colors">
              {t.privacy}
            </Link>
            <Link href="/contact" className="hover:text-white transition-colors">
              {t.contact}
            </Link>
            <Link href="/docs" className="hover:text-white transition-colors">
              {t.docs}
            </Link>
          </div>

          <div className="text-sm text-slate-400">
            © {currentYear} PadelGraph. {t.rights}
          </div>
        </div>
      </div>
    </footer>
  );
}
