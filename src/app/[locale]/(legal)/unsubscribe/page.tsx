import { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });

  return {
    title: t('unsubscribe.title', { default: 'Unsubscribe | PadelGraph' }),
    description: t('unsubscribe.description', { default: 'Manage your PadelGraph notification preferences and unsubscribe from communications.' }),
    robots: 'noindex, nofollow', // Don't index unsubscribe pages
  };
}

export default function UnsubscribePage() {
  const t = useTranslations('legal.unsubscribe');

  return (
    <LegalPageLayout
      title={t('heading', { default: 'Unsubscribe from Notifications' })}
      lastUpdated="October 18, 2025"
    >
      <div className="space-y-8 text-center max-w-2xl mx-auto">
        {/* Success Message (will be shown after successful unsubscribe) */}
        <div className="bg-green-50 border-l-4 border-green-500 p-6 text-left">
          <h2 className="text-xl font-semibold text-green-900 mb-2">
            ✅ {t('success.title', { default: 'Unsubscribe Request Received' })}
          </h2>
          <p className="text-green-800">
            {t('success.message', {
              default: 'We\'ve received your unsubscribe request. You will no longer receive promotional emails or SMS messages from PadelGraph.'
            })}
          </p>
        </div>

        {/* What Happens Next */}
        <section className="text-left">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('whatNext.title', { default: 'What Happens Next?' })}
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start space-x-3">
              <span className="text-green-600 text-xl">✓</span>
              <p>{t('whatNext.item1', {
                default: 'You will stop receiving marketing emails and SMS messages within 24-48 hours.'
              })}</p>
            </li>
            <li className="flex items-start space-x-3">
              <span className="text-blue-600 text-xl">ℹ️</span>
              <p>{t('whatNext.item2', {
                default: 'You will still receive important transactional messages (account security, match confirmations, payment receipts).'
              })}</p>
            </li>
            <li className="flex items-start space-x-3">
              <span className="text-purple-600 text-xl">🔄</span>
              <p>{t('whatNext.item3', {
                default: 'You can re-subscribe at any time by updating your notification preferences in Settings.'
              })}</p>
            </li>
          </ul>
        </section>

        {/* Alternative Methods */}
        <section className="text-left bg-gray-50 rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('alternatives.title', { default: 'Other Ways to Unsubscribe' })}
          </h2>

          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                📱 {t('alternatives.sms.title', { default: 'SMS Messages' })}
              </h3>
              <p className="text-sm">
                {t('alternatives.sms.desc', { default: 'Reply STOP to any SMS message from PadelGraph' })}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                📧 {t('alternatives.email.title', { default: 'Email Messages' })}
              </h3>
              <p className="text-sm">
                {t('alternatives.email.desc', { default: 'Click "Unsubscribe" link at the bottom of any email' })}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                ⚙️ {t('alternatives.app.title', { default: 'In-App Settings' })}
              </h3>
              <p className="text-sm">
                {t('alternatives.app.desc', { default: 'Go to Settings → Notifications → Customize your preferences' })}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                ✉️ {t('alternatives.contact.title', { default: 'Contact Support' })}
              </h3>
              <p className="text-sm">
                {t('alternatives.contact.desc', { default: 'Email us at' })} <a href="mailto:support@padelgraph.com" className="text-blue-600 hover:underline">support@padelgraph.com</a>
              </p>
            </div>
          </div>
        </section>

        {/* Complete Account Deletion */}
        <section className="text-left border-t border-gray-200 pt-6">
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            {t('deletion.title', { default: 'Want to Delete Your Account?' })}
          </h2>
          <p className="text-gray-700 mb-4">
            {t('deletion.desc', {
              default: 'If you want to completely delete your PadelGraph account and all associated data, you can do so in your account settings or by contacting our privacy team.'
            })}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/settings/account"
              className="inline-block bg-gray-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition text-center"
            >
              {t('deletion.settings', { default: 'Go to Account Settings' })}
            </a>
            <a
              href="mailto:privacy@padelgraph.com"
              className="inline-block bg-white border border-gray-300 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition text-center"
            >
              {t('deletion.contact', { default: 'Contact Privacy Team' })}
            </a>
          </div>
        </section>

        {/* Feedback */}
        <section className="bg-blue-50 rounded-lg p-6 text-left">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            💬 {t('feedback.title', { default: 'We\'d Love Your Feedback' })}
          </h3>
          <p className="text-blue-800 text-sm mb-3">
            {t('feedback.desc', {
              default: 'Help us improve by letting us know why you unsubscribed. Your feedback helps us serve you better.'
            })}
          </p>
          <a
            href="mailto:feedback@padelgraph.com?subject=Unsubscribe Feedback"
            className="text-blue-600 hover:underline font-medium text-sm"
          >
            {t('feedback.link', { default: 'Send Feedback →' })}
          </a>
        </section>
      </div>
    </LegalPageLayout>
  );
}
