/**
 * Email Service - Using Resend or Postmark
 * To be implemented in Sprint 1
 */

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    // Will use either Resend or Postmark based on env vars
    this.apiKey = process.env.RESEND_API_KEY || process.env.POSTMARK_SERVER_TOKEN || '';
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@padelgraph.com';
  }

  /**
   * Send email
   * @stub - To be implemented in Sprint 1
   */
  async send(params: SendEmailParams): Promise<EmailResponse> {
    console.log('[Email] Send stub called:', params);
    return {
      success: false,
      error: 'Email service not implemented yet',
    };
  }

  /**
   * Send template email
   * @stub - To be implemented in Sprint 1
   */
  async sendTemplate(
    templateId: string,
    params: Omit<SendEmailParams, 'html'> & { variables: Record<string, unknown> }
  ): Promise<EmailResponse> {
    console.log('[Email] Send template stub called:', templateId, params);
    return {
      success: false,
      error: 'Email template service not implemented yet',
    };
  }
}

export const emailService = new EmailService();
