import { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import Link from 'next/link';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });

  return {
    title: t('help.title', { default: 'Help & Support | PadelGraph' }),
    description: t('help.description', { default: 'Get help and support for PadelGraph. Contact us for technical issues, billing questions, or general inquiries.' }),
    openGraph: {
      title: t('help.title', { default: 'Help & Support | PadelGraph' }),
      description: t('help.description', { default: 'Get help and support for PadelGraph.' }),
      type: 'website',
    },
  };
}

export default function HelpPage() {
  const t = useTranslations('legal.help');

  return (
    <LegalPageLayout
      title={t('heading', { default: 'Help & Support' })}
      lastUpdated="October 18, 2025"
    >
      <div className="space-y-8">
        {/* Introduction */}
        <section>
          <p className="text-gray-700 leading-relaxed text-lg">
            {t('intro', { default: 'Need assistance? We\'re here to help!' })}
          </p>
        </section>

        {/* Contact Methods */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('contact.title', { default: '📧 Contact Methods' })}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('contact.general.title', { default: 'General Support' })}
              </h3>
              <p className="text-blue-600 hover:underline">
                <a href="mailto:support@padelgraph.com">support@padelgraph.com</a>
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('contact.technical.title', { default: 'Technical Issues' })}
              </h3>
              <p className="text-blue-600 hover:underline">
                <a href="mailto:tech@padelgraph.com">tech@padelgraph.com</a>
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('contact.billing.title', { default: 'Billing Questions' })}
              </h3>
              <p className="text-blue-600 hover:underline">
                <a href="mailto:billing@padelgraph.com">billing@padelgraph.com</a>
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('contact.privacy.title', { default: 'Privacy Concerns' })}
              </h3>
              <p className="text-blue-600 hover:underline">
                <a href="mailto:privacy@padelgraph.com">privacy@padelgraph.com</a>
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-6">
            <p className="text-sm text-blue-900">
              <strong>{t('contact.response', { default: 'Response Time' })}</strong>: {t('contact.responseTime', {
                default: 'Within 24-48 hours for most inquiries.'
              })}
            </p>
          </div>
        </section>

        {/* SMS Commands */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('sms.title', { default: '📱 SMS Commands' })}
          </h2>
          <p className="text-gray-700 mb-4">
            {t('sms.intro', { default: 'Send these keywords to any PadelGraph SMS:' })}
          </p>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded font-mono text-sm font-semibold">STOP</span>
              <p className="text-gray-700">{t('sms.stop', { default: 'Unsubscribe from SMS notifications' })}</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded font-mono text-sm font-semibold">START</span>
              <p className="text-gray-700">{t('sms.start', { default: 'Re-subscribe to SMS notifications' })}</p>
            </div>
            <div className="flex items-start space-x-3">
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded font-mono text-sm font-semibold">HELP</span>
              <p className="text-gray-700">{t('sms.help', { default: 'Display this help message' })}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            {t('sms.note', { default: 'Carrier charges may apply for SMS messages.' })}
          </p>
        </section>

        {/* Managing Notifications */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('notifications.title', { default: '🔔 Managing Notifications' })}
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                {t('notifications.inapp.title', { default: 'In-App Settings' })}
              </h3>
              <ol className="list-decimal pl-6 space-y-2 text-gray-700">
                <li>{t('notifications.inapp.step1', { default: 'Open PadelGraph app' })}</li>
                <li>{t('notifications.inapp.step2', { default: 'Go to Settings → Notifications' })}</li>
                <li>{t('notifications.inapp.step3', { default: 'Customize preferences by type:' })}
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>{t('notifications.inapp.type1', { default: 'Match reminders' })}</li>
                    <li>{t('notifications.inapp.type2', { default: 'Score updates' })}</li>
                    <li>{t('notifications.inapp.type3', { default: 'Club announcements' })}</li>
                    <li>{t('notifications.inapp.type4', { default: 'Social interactions' })}</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                {t('notifications.email.title', { default: 'Email Unsubscribe' })}
              </h3>
              <p className="text-gray-700">
                {t('notifications.email.desc', { default: 'Click "Unsubscribe" link at bottom of any email.' })}
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                {t('notifications.sms.title', { default: 'SMS Opt-Out' })}
              </h3>
              <p className="text-gray-700">
                {t('notifications.sms.desc', { default: 'Reply STOP to any SMS message.' })}
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('faq.title', { default: '❓ Frequently Asked Questions' })}
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {t('faq.delete.question', { default: 'How do I delete my account?' })}
              </h3>
              <p className="text-gray-700">
                {t('faq.delete.answer', { default: 'Settings → Account → Delete Account (or email privacy@padelgraph.com)' })}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {t('faq.cancel.question', { default: 'How do I cancel my subscription?' })}
              </h3>
              <p className="text-gray-700">
                {t('faq.cancel.answer', { default: 'Settings → Subscription → Cancel Subscription' })}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {t('faq.notifications.question', { default: 'Why am I not receiving notifications?' })}
              </h3>
              <p className="text-gray-700">
                {t('faq.notifications.answer', {
                  default: 'Check notification settings in-app and ensure we have correct contact info.'
                })}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {t('faq.report.question', { default: 'How do I report inappropriate content?' })}
              </h3>
              <p className="text-gray-700">
                {t('faq.report.answer', { default: 'Use "Report" button on content or email' })} <a href="mailto:abuse@padelgraph.com" className="text-blue-600 hover:underline">abuse@padelgraph.com</a>
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {t('faq.update.question', { default: 'How do I update my profile information?' })}
              </h3>
              <p className="text-gray-700">
                {t('faq.update.answer', { default: 'Settings → Profile → Edit Information' })}
              </p>
            </div>
          </div>
        </section>

        {/* Resources */}
        <section className="bg-gray-100 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('resources.title', { default: '📖 Resources' })}
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            <Link href="/privacy" className="text-blue-600 hover:underline">
              {t('resources.privacy', { default: 'Privacy Policy' })}
            </Link>
            <Link href="/terms" className="text-blue-600 hover:underline">
              {t('resources.terms', { default: 'Terms & Conditions' })}
            </Link>
          </div>
        </section>

        {/* Business Hours */}
        <section className="text-center bg-blue-50 rounded-lg p-6">
          <p className="text-gray-700">
            <strong>{t('hours.title', { default: 'Business Hours' })}</strong>: {t('hours.time', {
              default: 'Monday-Friday, 9 AM - 6 PM (GMT-4)'
            })}
          </p>
          <p className="text-gray-700 mt-2">
            <strong>{t('hours.emergency', { default: 'Emergency Issues' })}</strong>: <a href="mailto:urgent@padelgraph.com" className="text-blue-600 hover:underline">urgent@padelgraph.com</a>
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}
