import { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });

  return {
    title: t('terms.title', { default: 'Terms & Conditions | PadelGraph' }),
    description: t('terms.description', { default: 'Read PadelGraph terms of service and usage policies.' }),
    openGraph: {
      title: t('terms.title', { default: 'Terms & Conditions | PadelGraph' }),
      description: t('terms.description', { default: 'Read PadelGraph terms of service and usage policies.' }),
      type: 'website',
    },
  };
}

export default function TermsPage() {
  const t = useTranslations('legal.terms');

  return (
    <LegalPageLayout
      title={t('heading', { default: 'Terms and Conditions' })}
      lastUpdated="October 18, 2025"
    >
      <div className="space-y-8">
        {/* Introduction */}
        <section>
          <p className="text-gray-700 leading-relaxed">
            {t('intro', {
              default: 'Welcome to PadelGraph. By accessing or using our platform, you agree to these Terms.'
            })}
          </p>
        </section>

        {/* 1. Acceptance */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('section1.title', { default: '1. Acceptance of Terms' })}
          </h2>
          <p className="text-gray-700">
            {t('section1.content', {
              default: 'By creating an account or using PadelGraph, you accept these Terms and our Privacy Policy. If you disagree, do not use the Service.'
            })}
          </p>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
            <p className="text-sm text-yellow-900">
              <strong>{t('section1.binding', { default: 'Binding Agreement' })}</strong>: {t('section1.bindingDesc', {
                default: 'These Terms constitute a legally binding contract between you and PadelGraph.'
              })}
            </p>
          </div>
        </section>

        {/* 2. Service Description */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('section2.title', { default: '2. Service Description' })}
          </h2>
          <p className="text-gray-700 mb-4">
            {t('section2.intro', { default: 'PadelGraph provides:' })}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>{t('section2.item1', { default: 'Player profiles and skill tracking' })}</li>
            <li>{t('section2.item2', { default: 'Match scheduling and score recording' })}</li>
            <li>{t('section2.item3', { default: 'Club and tournament discovery' })}</li>
            <li>{t('section2.item4', { default: 'Social features (feed, messaging, connections)' })}</li>
            <li>{t('section2.item5', { default: 'Travel mode for finding players while traveling' })}</li>
            <li>{t('section2.item6', { default: 'Premium subscription features' })}</li>
          </ul>
        </section>

        {/* 3. Eligibility */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('section3.title', { default: '3. Eligibility' })}
          </h2>
          <p className="text-gray-700 mb-4">
            {t('section3.intro', { default: 'You must be:' })}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>{t('section3.age', { default: '13+ years old (16+ in EU) to create an account' })}</li>
            <li>{t('section3.capable', { default: 'Capable of forming a binding contract' })}</li>
            <li>{t('section3.notProhibited', { default: 'Not prohibited from using the Service by law' })}</li>
          </ul>
        </section>

        {/* 5. Messaging Consent */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('section5.title', { default: '5. Messaging & Communications Consent' })}
          </h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            {t('section5.whatYouAgree.title', { default: 'What You Agree To' })}
          </h3>
          <p className="text-gray-700 mb-3">
            {t('section5.whatYouAgree.intro', { default: 'By registering, you consent to receive:' })}
          </p>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                {t('section5.transactional.title', { default: 'Transactional Communications (cannot opt-out)' })}:
              </h4>
              <ul className="list-disc pl-6 space-y-1 text-gray-700 text-sm">
                <li>{t('section5.transactional.item1', { default: 'Account security alerts' })}</li>
                <li>{t('section5.transactional.item2', { default: 'Match confirmations and updates' })}</li>
                <li>{t('section5.transactional.item3', { default: 'Payment confirmations' })}</li>
                <li>{t('section5.transactional.item4', { default: 'Critical service announcements' })}</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">
                {t('section5.marketing.title', { default: 'Marketing Communications (can opt-out)' })}:
              </h4>
              <ul className="list-disc pl-6 space-y-1 text-gray-700 text-sm">
                <li>{t('section5.marketing.item1', { default: 'Product updates and new features' })}</li>
                <li>{t('section5.marketing.item2', { default: 'Tournament and event promotions' })}</li>
                <li>{t('section5.marketing.item3', { default: 'Community highlights' })}</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-6">
            <p className="text-sm text-blue-900">
              <strong>{t('section5.methods.title', { default: 'Delivery Methods' })}</strong>: SMS/Text, Email, WhatsApp, Push notifications<br />
              <strong>{t('section5.optout.title', { default: 'Opt-Out' })}</strong>:<br />
              • SMS: {t('section5.optout.sms', { default: 'Reply STOP' })}<br />
              • Email: {t('section5.optout.email', { default: 'Click "Unsubscribe"' })}<br />
              • App: {t('section5.optout.app', { default: 'Settings → Notifications' })}<br />
              <strong>{t('section5.cost.title', { default: 'Cost' })}</strong>: {t('section5.cost.desc', { default: 'Standard messaging and data rates apply' })}
            </p>
          </div>
        </section>

        {/* 7. Payments */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('section7.title', { default: '7. Payments & Subscriptions' })}
          </h2>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            {t('section7.paid.title', { default: 'Paid Features' })}
          </h3>
          <p className="text-gray-700 mb-3">
            {t('section7.paid.intro', { default: 'Some features require a subscription or one-time payment:' })}
          </p>
          <ul className="list-disc pl-6 space-y-1 text-gray-700 text-sm mb-6">
            <li>{t('section7.paid.item1', { default: 'Premium analytics and insights' })}</li>
            <li>{t('section7.paid.item2', { default: 'Advanced tournament features' })}</li>
            <li>{t('section7.paid.item3', { default: 'Priority support' })}</li>
            <li>{t('section7.paid.item4', { default: 'Ad-free experience' })}</li>
          </ul>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            {t('section7.billing.title', { default: 'Billing' })}
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 text-sm">
            <li><strong>{t('section7.billing.processors', { default: 'Processors' })}</strong>: Stripe, PayPal, App Store/Google Play</li>
            <li><strong>{t('section7.billing.security', { default: 'Security' })}</strong>: {t('section7.billing.securityDesc', { default: 'We do NOT store payment information' })}</li>
            <li><strong>{t('section7.billing.renewal', { default: 'Auto-Renewal' })}</strong>: {t('section7.billing.renewalDesc', { default: 'Subscriptions renew automatically unless canceled' })}</li>
          </ul>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
            <p className="text-sm text-green-900">
              <strong>{t('section7.cancel.title', { default: 'Cancellation' })}</strong>: {t('section7.cancel.desc', {
                default: 'Settings → Subscription → Cancel or email billing@padelgraph.com'
              })}
            </p>
          </div>
        </section>

        {/* 9. Limitation of Liability */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('section9.title', { default: '9. Limitation of Liability' })}
          </h2>
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-sm text-red-900 font-semibold">
              {t('section9.important', { default: 'TO THE MAXIMUM EXTENT PERMITTED BY LAW:' })}
            </p>
          </div>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            {t('section9.noWarranty.title', { default: 'No Warranties' })}
          </h3>
          <p className="text-gray-700 mb-6">
            {t('section9.noWarranty.desc', { default: 'The Service is provided "AS IS" without warranties of any kind.' })}
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mb-3">
            {t('section9.noLiability.title', { default: 'No Liability For' })}
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-700">
            <li>{t('section9.noLiability.item1', { default: 'Injuries or damages from matches/activities organized via the platform' })}</li>
            <li>{t('section9.noLiability.item2', { default: 'Loss of data or account access' })}</li>
            <li>{t('section9.noLiability.item3', { default: 'Third-party actions (other users, clubs, tournaments)' })}</li>
            <li>{t('section9.noLiability.item4', { default: 'Service interruptions or errors' })}</li>
          </ul>
        </section>

        {/* Contact */}
        <section className="bg-gray-100 rounded-lg p-6 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t('contact.title', { default: '15. Contact Information' })}
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-gray-700">
            <div>
              <p className="font-semibold mb-2">{t('contact.general', { default: 'General Support' })}:</p>
              <p>📧 <a href="mailto:support@padelgraph.com" className="text-blue-600 hover:underline">support@padelgraph.com</a></p>
            </div>
            <div>
              <p className="font-semibold mb-2">{t('contact.legal', { default: 'Legal Inquiries' })}:</p>
              <p>📧 <a href="mailto:legal@padelgraph.com" className="text-blue-600 hover:underline">legal@padelgraph.com</a></p>
            </div>
            <div>
              <p className="font-semibold mb-2">{t('contact.billing', { default: 'Billing Questions' })}:</p>
              <p>📧 <a href="mailto:billing@padelgraph.com" className="text-blue-600 hover:underline">billing@padelgraph.com</a></p>
            </div>
            <div>
              <p className="font-semibold mb-2">{t('contact.address', { default: 'Mailing Address' })}:</p>
              <p>PadelGraph<br />Santo Domingo, Dominican Republic</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">
            {t('contact.response', { default: 'Response Time: 3 business days for non-urgent inquiries.' })}
          </p>
        </section>
      </div>
    </LegalPageLayout>
  );
}
