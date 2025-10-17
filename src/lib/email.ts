/**
 * Email Service - Using Resend
 * Implemented in Sprint 1
 */
import { Resend } from 'resend';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  text?: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private client: Resend | null = null;
  private defaultFrom: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.defaultFrom = process.env.EMAIL_FROM || 'noreply@padelgraph.com';

    if (apiKey) {
      this.client = new Resend(apiKey);
    } else {
      console.warn('[Email] Resend API key not found - service disabled');
    }
  }

  /**
   * Send email via Resend
   */
  async send(params: SendEmailParams): Promise<EmailResponse> {
    if (!this.client) {
      return {
        success: false,
        error: 'Email service not configured',
      };
    }

    try {
      const result = await this.client.emails.send({
        from: params.from || this.defaultFrom,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        ...(params.text && { text: params.text }),
      });

      if (result.error) {
        console.error('[Email] Send error:', result.error);
        return {
          success: false,
          error: result.error.message,
        };
      }

      console.log('[Email] Sent successfully:', result.data?.id);

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      console.error('[Email] Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send template email with variables
   * For now, uses simple HTML template replacement
   * In future, can integrate with React Email or proper templating
   */
  async sendTemplate(
    templateId: string,
    params: Omit<SendEmailParams, 'html' | 'subject'> & {
      subject?: string;
      variables: Record<string, unknown>;
    }
  ): Promise<EmailResponse> {
    // Load template based on templateId
    const template = this.getTemplate(templateId, params.variables);

    if (!template) {
      return {
        success: false,
        error: `Template ${templateId} not found`,
      };
    }

    return this.send({
      ...params,
      html: template.html,
      subject: template.subject || params.subject || 'PadelGraph Notification',
    });
  }

  /**
   * Get email template by ID
   * This is a simple implementation - in production, load from files or DB
   */
  private getTemplate(
    templateId: string,
    variables: Record<string, unknown>
  ): { html: string; subject: string } | null {
    const templates: Record<string, (vars: Record<string, unknown>) => { html: string; subject: string }> = {
      'welcome': (vars) => ({
        subject: 'Welcome to PadelGraph! 🎾',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Welcome, ${vars.name || 'Player'}!</h1>
            <p>Thanks for joining PadelGraph, the social network for padel players.</p>
            <p>Get started by completing your profile and finding other players in your area.</p>
            <a href="${vars.appUrl || 'https://padelgraph.com'}" style="display: inline-block; padding: 12px 24px; background: #22c55e; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
              Complete Profile
            </a>
          </div>
        `,
      }),
      'booking-confirmation': (vars) => ({
        subject: `Booking Confirmed - ${vars.courtName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1>Booking Confirmed ✅</h1>
            <p>Hi ${vars.userName},</p>
            <p>Your booking has been confirmed:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Court:</strong> ${vars.courtName}</p>
              <p><strong>Date:</strong> ${vars.date}</p>
              <p><strong>Time:</strong> ${vars.time}</p>
              <p><strong>Price:</strong> ${vars.price}</p>
            </div>
            <p>See you on the court! 🎾</p>
          </div>
        `,
      }),
    };

    const templateFn = templates[templateId];
    return templateFn ? templateFn(variables) : null;
  }
}

export const emailService = new EmailService();
