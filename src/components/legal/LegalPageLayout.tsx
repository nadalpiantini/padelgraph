import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface LegalPageLayoutProps {
  children: React.ReactNode;
  title: string;
  lastUpdated: string;
}

export default function LegalPageLayout({ children, title, lastUpdated }: LegalPageLayoutProps) {
  const t = useTranslations();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← {t('legal.backToHome', { default: 'Back to Home' })}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-600 mt-2">
            {t('legal.lastUpdated', { default: 'Last updated' })}: {lastUpdated}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 prose prose-blue max-w-none">
          {children}
        </div>
      </main>

      {/* Footer with quick links */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <Link href="/privacy" className="text-gray-600 hover:text-blue-600">
              {t('legal.privacy', { default: 'Privacy Policy' })}
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-blue-600">
              {t('legal.terms', { default: 'Terms & Conditions' })}
            </Link>
            <Link href="/help" className="text-gray-600 hover:text-blue-600">
              {t('legal.help', { default: 'Help & Support' })}
            </Link>
            <a href="mailto:support@padelgraph.com" className="text-gray-600 hover:text-blue-600">
              {t('legal.contact', { default: 'Contact Us' })}
            </a>
          </div>
          <div className="mt-6 text-center text-gray-500 text-xs">
            © {new Date().getFullYear()} PadelGraph. {t('legal.allRightsReserved', { default: 'All rights reserved.' })}
          </div>
        </div>
      </footer>
    </div>
  );
}
