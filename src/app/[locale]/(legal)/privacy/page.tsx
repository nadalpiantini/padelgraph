import { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });

  return {
    title: t('privacy.title', { default: 'Privacy Policy | PadelGraph' }),
    description: t('privacy.description', { default: 'Learn how PadelGraph protects your privacy and handles your personal data.' }),
    openGraph: {
      title: t('privacy.title', { default: 'Privacy Policy | PadelGraph' }),
      description: t('privacy.description', { default: 'Learn how PadelGraph protects your privacy and handles your personal data.' }),
      type: 'website',
    },
  };
}

export default function PrivacyPage() {
  const t = useTranslations('legal.privacy');

  return (
    <LegalPageLayout
      title={t('heading', { default: 'Privacy Policy' })}
      lastUpdated="October 18, 2025"
    >
      <div className="space-y-8">
        {/* Introduction */}
        <section>
          <p className="text-gray-700 leading-relaxed">
            {t('intro', {
              default: 'PadelGraph ("we", "us", or "our") operates the PadelGraph platform at https://padelgraph.com. We are committed to protecting your privacy and complying with GDPR, CCPA, and international data protection standards.'
            })}
          </p>
        </section>

        {/* 1. Information We Collect */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('section1.title', { default: '1. Information We Collect' })}
          </h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
            {t('section1.account.title', { default: 'Account Information' })}
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>{t('section1.account.item1', { default: 'Name, email, phone number' })}</li>
            <li>{t('section1.account.item2', { default: 'Profile photo and bio' })}</li>
            <li>{t('section1.account.item3', { default: 'Age range and location (city/country)' })}</li>
            <li>{t('section1.account.item4', { default: 'Skill level and playing preferences' })}</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
            {t('section1.activity.title', { default: 'Activity Data' })}
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>{t('section1.activity.item1', { default: 'Match history, scores, and statistics' })}</li>
            <li>{t('section1.activity.item2', { default: 'Player connections and club memberships' })}</li>
            <li>{t('section1.activity.item3', { default: 'Tournament participation and rankings' })}</li>
            <li>{t('section1.activity.item4', { default: 'Travel plans and availability' })}</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
            {t('section1.technical.title', { default: 'Technical Data' })}
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>{t('section1.technical.item1', { default: 'IP address and device identifiers' })}</li>
            <li>{t('section1.technical.item2', { default: 'Browser type and operating system' })}</li>
            <li>{t('section1.technical.item3', { default: 'App usage analytics and crash reports' })}</li>
            <li>{t('section1.technical.item4', { default: 'Location data (with your permission)' })}</li>
          </ul>
        </section>

        {/* 2. How We Use Your Information */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('section2.title', { default: '2. How We Use Your Information' })}
          </h2>
          <p className="text-gray-700 mb-4">
            {t('section2.intro', { default: 'We process your data to:' })}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>{t('section2.provide.title', { default: 'Provide Services' })}</strong>: {t('section2.provide.desc', { default: 'Create accounts, match players, track scores' })}</li>
            <li><strong>{t('section2.notify.title', { default: 'Send Notifications' })}</strong>: {t('section2.notify.desc', { default: 'Match reminders, score updates, club announcements' })}</li>
            <li><strong>{t('section2.improve.title', { default: 'Improve Platform' })}</strong>: {t('section2.improve.desc', { default: 'Analyze usage patterns, fix bugs, develop features' })}</li>
            <li><strong>{t('section2.security.title', { default: 'Security & Compliance' })}</strong>: {t('section2.security.desc', { default: 'Prevent fraud, enforce Terms, comply with laws' })}</li>
          </ul>
        </section>

        {/* 3. Communications & Messaging */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('section3.title', { default: '3. Communications & Messaging' })}
          </h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
            {t('section3.transactional.title', { default: 'Transactional Messages (Cannot Opt-Out)' })}
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>{t('section3.transactional.item1', { default: 'Account verification and security alerts' })}</li>
            <li>{t('section3.transactional.item2', { default: 'Match confirmations and critical updates' })}</li>
            <li>{t('section3.transactional.item3', { default: 'Payment receipts and subscription changes' })}</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
            {t('section3.marketing.title', { default: 'Marketing Messages (Can Opt-Out)' })}
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>{t('section3.marketing.item1', { default: 'Product updates and new features' })}</li>
            <li>{t('section3.marketing.item2', { default: 'Tournament announcements and special events' })}</li>
            <li>{t('section3.marketing.item3', { default: 'Tips and community highlights' })}</li>
          </ul>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-6">
            <p className="text-sm text-blue-900">
              <strong>{t('section3.optout.title', { default: 'Opt-out methods' })}:</strong><br />
              <strong>SMS:</strong> {t('section3.optout.sms', { default: 'Reply STOP to any message' })}<br />
              <strong>Email:</strong> {t('section3.optout.email', { default: 'Click "Unsubscribe" link' })}<br />
              <strong>App:</strong> {t('section3.optout.app', { default: 'Settings → Notifications → Customize preferences' })}
            </p>
          </div>
        </section>

        {/* 4. Data Sharing */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('section4.title', { default: '4. Data Sharing & Disclosure' })}
          </h2>
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
            <p className="text-green-900 font-semibold">
              {t('section4.noSell', { default: 'We DO NOT sell your personal data.' })}
            </p>
          </div>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            {t('section4.providers.title', { default: 'Service Providers' })}
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>Supabase</strong>: {t('section4.providers.supabase', { default: 'Database hosting' })}</li>
            <li><strong>Twilio</strong>: {t('section4.providers.twilio', { default: 'SMS/WhatsApp messaging' })}</li>
            <li><strong>Stripe & PayPal</strong>: {t('section4.providers.payments', { default: 'Payment processing' })}</li>
            <li><strong>Vercel</strong>: {t('section4.providers.vercel', { default: 'Hosting and CDN' })}</li>
          </ul>
        </section>

        {/* 7. Your Rights */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('section7.title', { default: '7. Your Rights' })}
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li><strong>{t('section7.access.title', { default: 'Access' })}</strong>: {t('section7.access.desc', { default: 'Request copy of your data' })}</li>
            <li><strong>{t('section7.correction.title', { default: 'Correction' })}</strong>: {t('section7.correction.desc', { default: 'Update inaccurate information' })}</li>
            <li><strong>{t('section7.deletion.title', { default: 'Deletion' })}</strong>: {t('section7.deletion.desc', { default: 'Request account and data removal' })}</li>
            <li><strong>{t('section7.portability.title', { default: 'Portability' })}</strong>: {t('section7.portability.desc', { default: 'Export your data in machine-readable format' })}</li>
          </ul>

          <div className="bg-gray-50 border-l-4 border-gray-500 p-4 mt-6">
            <p className="text-sm text-gray-900">
              <strong>{t('section7.exercise.title', { default: 'Exercise your rights' })}:</strong><br />
              📧 Email: <a href="mailto:privacy@padelgraph.com" className="text-blue-600 hover:underline">privacy@padelgraph.com</a><br />
              📱 In-app: {t('section7.exercise.inapp', { default: 'Settings → Privacy → Data Requests' })}<br />
              {t('section7.exercise.response', { default: 'Response time: 30 days maximum' })}
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-gray-100 rounded-lg p-6 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('contact.title', { default: '13. Contact Us' })}
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>
              <strong>{t('contact.privacy', { default: 'Data Protection Inquiries' })}:</strong><br />
              📧 <a href="mailto:privacy@padelgraph.com" className="text-blue-600 hover:underline">privacy@padelgraph.com</a>
            </p>
            <p>
              <strong>{t('contact.support', { default: 'General Support' })}:</strong><br />
              📧 <a href="mailto:support@padelgraph.com" className="text-blue-600 hover:underline">support@padelgraph.com</a>
            </p>
            <p>
              <strong>{t('contact.address', { default: 'Mailing Address' })}:</strong><br />
              PadelGraph<br />
              Santo Domingo, Dominican Republic
            </p>
            <p className="text-sm text-gray-600">
              {t('contact.response', { default: 'Response time: Within 3 business days for privacy requests.' })}
            </p>
          </div>
        </section>
      </div>
    </LegalPageLayout>
  );
}
