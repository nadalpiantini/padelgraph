/**
 * PayPal Email Notification Templates
 * Sprint 5 Phase 2: Subscription Email System
 *
 * Bilingual templates (EN/ES) for PayPal subscription events
 */

import { emailService } from '@/lib/email';

export interface EmailTemplate {
  subject: { en: string; es: string };
  html: (params: Record<string, string>) => { en: string; es: string };
}

// ==============================================
// EMAIL TEMPLATES
// ==============================================

export const PayPalEmailTemplates = {
  subscriptionActivated: {
    subject: {
      en: '🎾 Your PadelGraph subscription is now active!',
      es: '🎾 ¡Tu suscripción de PadelGraph está activa!',
    },
    html: (params: { name: string; plan: string; nextBillingDate: string }) => ({
      en: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to ${params.plan}! 🎉</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hi ${params.name},</p>

            <p>Your subscription is now <strong>active</strong> and ready to use!</p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 8px 0;"><strong>Plan:</strong> ${params.plan}</p>
              <p style="margin: 8px 0;"><strong>Next billing date:</strong> ${params.nextBillingDate}</p>
            </div>

            <p>You now have access to:</p>
            <ul style="list-style: none; padding-left: 0;">
              <li style="padding: 8px 0;">✅ Unlimited tournaments</li>
              <li style="padding: 8px 0;">✅ Advanced analytics dashboard</li>
              <li style="padding: 8px 0;">✅ Achievement tracking</li>
              <li style="padding: 8px 0;">✅ Global leaderboards</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/dashboard"
                 style="background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                Go to Dashboard →
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Questions? Reply to this email or visit our <a href="https://padelgraph.com/help" style="color: #10b981;">Help Center</a>.
            </p>
          </div>
        </body>
        </html>
      `,
      es: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">¡Bienvenido a ${params.plan}! 🎉</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hola ${params.name},</p>

            <p>Tu suscripción está <strong>activa</strong> y lista para usar!</p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 8px 0;"><strong>Plan:</strong> ${params.plan}</p>
              <p style="margin: 8px 0;"><strong>Próxima fecha de cobro:</strong> ${params.nextBillingDate}</p>
            </div>

            <p>Ahora tienes acceso a:</p>
            <ul style="list-style: none; padding-left: 0;">
              <li style="padding: 8px 0;">✅ Torneos ilimitados</li>
              <li style="padding: 8px 0;">✅ Dashboard de analytics avanzado</li>
              <li style="padding: 8px 0;">✅ Seguimiento de logros</li>
              <li style="padding: 8px 0;">✅ Rankings globales</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/dashboard"
                 style="background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                Ir al Panel →
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              ¿Preguntas? Responde a este email o visita nuestro <a href="https://padelgraph.com/help" style="color: #10b981;">Centro de Ayuda</a>.
            </p>
          </div>
        </body>
        </html>
      `,
    }),
  },

  subscriptionCancelled: {
    subject: {
      en: 'Your PadelGraph subscription has been cancelled',
      es: 'Tu suscripción de PadelGraph ha sido cancelada',
    },
    html: (params: { name: string; expiryDate: string }) => ({
      en: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #ef4444; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Subscription Cancelled</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hi ${params.name},</p>

            <p>We're sorry to see you go 😢</p>

            <p>Your subscription has been <strong>cancelled</strong> as requested.</p>

            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 0;"><strong>Access until:</strong> ${params.expiryDate}</p>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
                You'll continue to have full access until this date.
              </p>
            </div>

            <p><strong>Changed your mind?</strong></p>
            <p>You can reactivate your subscription anytime from your account settings.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/account/billing"
                 style="background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                Reactivate Subscription
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              We'd love to hear why you left. <a href="https://padelgraph.com/feedback" style="color: #10b981;">Send us feedback</a>
            </p>
          </div>
        </body>
        </html>
      `,
      es: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #ef4444; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Suscripción Cancelada</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hola ${params.name},</p>

            <p>Lamentamos verte partir 😢</p>

            <p>Tu suscripción ha sido <strong>cancelada</strong> como solicitaste.</p>

            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 0;"><strong>Acceso hasta:</strong> ${params.expiryDate}</p>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
                Seguirás teniendo acceso completo hasta esta fecha.
              </p>
            </div>

            <p><strong>¿Cambiaste de opinión?</strong></p>
            <p>Puedes reactivar tu suscripción en cualquier momento desde la configuración de tu cuenta.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/account/billing"
                 style="background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                Reactivar Suscripción
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Nos encantaría saber por qué te fuiste. <a href="https://padelgraph.com/feedback" style="color: #10b981;">Envíanos tu opinión</a>
            </p>
          </div>
        </body>
        </html>
      `,
    }),
  },

  subscriptionSuspended: {
    subject: {
      en: '⚠️ Action required: Update your payment method',
      es: '⚠️ Acción requerida: Actualiza tu método de pago',
    },
    html: (params: { name: string }) => ({
      en: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f59e0b; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ Payment Issue Detected</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hi ${params.name},</p>

            <p>Your subscription is <strong>suspended</strong> due to a payment issue.</p>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-weight: 600;">Action Required:</p>
              <p style="margin: 8px 0 0 0;">Please update your payment method to continue enjoying PadelGraph.</p>
            </div>

            <p><strong>What happens next?</strong></p>
            <ul style="padding-left: 20px;">
              <li>Your account remains active for 7 days (grace period)</li>
              <li>After 7 days, you'll be downgraded to the Free plan</li>
              <li>Update your payment method anytime to restore full access</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/account/billing"
                 style="background: #ef4444; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                Update Payment Method →
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Need help? <a href="https://padelgraph.com/support" style="color: #10b981;">Contact support</a>
            </p>
          </div>
        </body>
        </html>
      `,
      es: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f59e0b; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ Problema de Pago Detectado</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hola ${params.name},</p>

            <p>Tu suscripción está <strong>suspendida</strong> debido a un problema con el pago.</p>

            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-weight: 600;">Acción Requerida:</p>
              <p style="margin: 8px 0 0 0;">Por favor actualiza tu método de pago para seguir disfrutando de PadelGraph.</p>
            </div>

            <p><strong>¿Qué pasa ahora?</strong></p>
            <ul style="padding-left: 20px;">
              <li>Tu cuenta permanece activa por 7 días (período de gracia)</li>
              <li>Después de 7 días, bajarás al plan Gratis</li>
              <li>Actualiza tu método de pago en cualquier momento para restaurar el acceso completo</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/account/billing"
                 style="background: #ef4444; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                Actualizar Método de Pago →
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              ¿Necesitas ayuda? <a href="https://padelgraph.com/support" style="color: #10b981;">Contacta soporte</a>
            </p>
          </div>
        </body>
        </html>
      `,
    }),
  },

  subscriptionExpired: {
    subject: {
      en: 'Your PadelGraph subscription has expired',
      es: 'Tu suscripción de PadelGraph ha expirado',
    },
    html: (params: { name: string }) => ({
      en: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #6b7280; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Subscription Expired</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hi ${params.name},</p>

            <p>Your subscription has <strong>expired</strong> and you've been moved to the <strong>Free plan</strong>.</p>

            <p><strong>You still have access to:</strong></p>
            <ul style="padding-left: 20px;">
              <li>2 tournaments per month</li>
              <li>Basic match scheduling</li>
              <li>Social feed</li>
              <li>Profile and connections</li>
            </ul>

            <p><strong>Want to upgrade?</strong></p>
            <p>Get back to unlimited tournaments, advanced analytics, and more.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/pricing"
                 style="background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                View Plans →
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
      es: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #6b7280; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Suscripción Expirada</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hola ${params.name},</p>

            <p>Tu suscripción ha <strong>expirado</strong> y has sido movido al <strong>plan Gratis</strong>.</p>

            <p><strong>Aún tienes acceso a:</strong></p>
            <ul style="padding-left: 20px;">
              <li>2 torneos por mes</li>
              <li>Programación básica de partidos</li>
              <li>Feed social</li>
              <li>Perfil y conexiones</li>
            </ul>

            <p><strong>¿Quieres mejorar?</strong></p>
            <p>Vuelve a torneos ilimitados, analytics avanzado y más.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/pricing"
                 style="background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                Ver Planes →
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
    }),
  },

  paymentCompleted: {
    subject: {
      en: '✅ Payment received - Thank you!',
      es: '✅ Pago recibido - ¡Gracias!',
    },
    html: (params: { name: string; amount: string; currency: string; invoiceId: string }) => ({
      en: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">✅ Payment Confirmed</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hi ${params.name},</p>

            <p>We've successfully received your payment!</p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 8px 0;"><strong>Amount:</strong> ${params.amount} ${params.currency}</p>
              <p style="margin: 8px 0;"><strong>Invoice ID:</strong> ${params.invoiceId}</p>
            </div>

            <p>Thank you for being a valued member of PadelGraph! 🎾</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/account/billing"
                 style="background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                View Billing Details →
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
      es: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">✅ Pago Confirmado</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hola ${params.name},</p>

            <p>¡Hemos recibido tu pago exitosamente!</p>

            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 8px 0;"><strong>Monto:</strong> ${params.amount} ${params.currency}</p>
              <p style="margin: 8px 0;"><strong>ID de Factura:</strong> ${params.invoiceId}</p>
            </div>

            <p>¡Gracias por ser un miembro valioso de PadelGraph! 🎾</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/account/billing"
                 style="background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                Ver Detalles de Facturación →
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
    }),
  },

  paymentFailed: {
    subject: {
      en: '❌ Payment failed - Action required',
      es: '❌ Pago fallido - Acción requerida',
    },
    html: (params: { name: string; retryDate: string }) => ({
      en: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #ef4444; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">❌ Payment Unsuccessful</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hi ${params.name},</p>

            <p>We couldn't process your payment. This could be due to:</p>

            <ul style="padding-left: 20px;">
              <li>Insufficient funds</li>
              <li>Expired payment method</li>
              <li>Card issuer declined the transaction</li>
            </ul>

            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 0;"><strong>Next retry:</strong> ${params.retryDate}</p>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
                We'll automatically retry. To avoid service interruption, please update your payment details.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/account/billing"
                 style="background: #ef4444; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                Update Payment Method →
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Need help? <a href="https://padelgraph.com/support" style="color: #10b981;">Contact support</a>
            </p>
          </div>
        </body>
        </html>
      `,
      es: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #ef4444; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">❌ Pago No Exitoso</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hola ${params.name},</p>

            <p>No pudimos procesar tu pago. Esto podría deberse a:</p>

            <ul style="padding-left: 20px;">
              <li>Fondos insuficientes</li>
              <li>Método de pago vencido</li>
              <li>El emisor de la tarjeta declinó la transacción</li>
            </ul>

            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
              <p style="margin: 0;"><strong>Próximo reintento:</strong> ${params.retryDate}</p>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">
                Reintentaremos automáticamente. Para evitar interrupciones, actualiza tus datos de pago.
              </p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/account/billing"
                 style="background: #ef4444; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                Actualizar Método de Pago →
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              ¿Necesitas ayuda? <a href="https://padelgraph.com/support" style="color: #10b981;">Contacta soporte</a>
            </p>
          </div>
        </body>
        </html>
      `,
    }),
  },

  subscriptionReactivated: {
    subject: {
      en: '🎉 Your subscription has been reactivated!',
      es: '🎉 ¡Tu suscripción ha sido reactivada!',
    },
    html: (params: { name: string; plan: string }) => ({
      en: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Welcome Back! 🎉</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hi ${params.name},</p>

            <p>Great news! Your <strong>${params.plan}</strong> subscription has been <strong>reactivated</strong>.</p>

            <p>You now have full access to all premium features again.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/dashboard"
                 style="background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                Go to Dashboard →
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
      es: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #10b981; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">¡Bienvenido de Vuelta! 🎉</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 18px; margin-top: 0;">Hola ${params.name},</p>

            <p>¡Buenas noticias! Tu suscripción <strong>${params.plan}</strong> ha sido <strong>reactivada</strong>.</p>

            <p>Ahora tienes acceso completo a todas las funciones premium nuevamente.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://padelgraph.com/dashboard"
                 style="background: #10b981; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
                Ir al Panel →
              </a>
            </div>
          </div>
        </body>
        </html>
      `,
    }),
  },
};

// ==============================================
// HELPER FUNCTIONS
// ==============================================

/**
 * Send PayPal notification email
 * Automatically uses user's preferred language from database
 */
export async function sendPayPalNotification(
  template: keyof typeof PayPalEmailTemplates,
  to: string,
  params: any,
  locale: 'en' | 'es' = 'en'
): Promise<void> {
  const tpl = PayPalEmailTemplates[template];

  if (!tpl) {
    console.error(`[PayPal Email] Template not found: ${template}`);
    return;
  }

  try {
    await emailService.send({
      to,
      subject: tpl.subject[locale],
      html: tpl.html(params)[locale],
    });

    console.log(`[PayPal Email] Sent ${template} to ${to} (${locale})`);
  } catch (error) {
    console.error(`[PayPal Email] Failed to send ${template}:`, error);
    // Don't throw - email failures shouldn't break webhook processing
  }
}

/**
 * Get user's preferred locale from database
 * Falls back to 'en' if not found
 */
export async function getUserLocale(userId: string): Promise<'en' | 'es'> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();

    const { data } = await supabase
      .from('user_profile')
      .select('preferred_language')
      .eq('user_id', userId)
      .single();

    return (data?.preferred_language as 'en' | 'es') || 'en';
  } catch {
    return 'en';
  }
}
