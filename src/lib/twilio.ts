/**
 * Twilio Service - WhatsApp and SMS Communication
 * Implemented in Sprint 1
 */
import twilio from 'twilio';

interface SendMessageParams {
  to: string;
  body: string;
  from?: string;
}

interface TwilioResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class TwilioService {
  private client: ReturnType<typeof twilio> | null = null;
  private whatsappFrom: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
    } else {
      console.warn('[Twilio] Missing credentials - service disabled');
    }
  }

  /**
   * Send WhatsApp message via Twilio
   */
  async sendWhatsApp(params: SendMessageParams): Promise<TwilioResponse> {
    if (!this.client) {
      return {
        success: false,
        error: 'Twilio not configured',
      };
    }

    try {
      // Format phone number for WhatsApp
      const to = params.to.startsWith('whatsapp:') ? params.to : `whatsapp:${params.to}`;
      const from = params.from || this.whatsappFrom;

      const message = await this.client.messages.create({
        body: params.body,
        from,
        to,
      });

      console.log('[Twilio] WhatsApp sent:', message.sid);

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error) {
      console.error('[Twilio] WhatsApp error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send SMS message via Twilio
   */
  async sendSMS(params: SendMessageParams): Promise<TwilioResponse> {
    if (!this.client) {
      return {
        success: false,
        error: 'Twilio not configured',
      };
    }

    try {
      const message = await this.client.messages.create({
        body: params.body,
        from: params.from || process.env.TWILIO_PHONE_FROM,
        to: params.to,
      });

      console.log('[Twilio] SMS sent:', message.sid);

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error) {
      console.error('[Twilio] SMS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send WhatsApp with template (for future use)
   */
  async sendWhatsAppTemplate(params: SendMessageParams & { templateId?: string }): Promise<TwilioResponse> {
    // For now, just send as regular message
    // In future, integrate with WhatsApp Business API templates
    return this.sendWhatsApp(params);
  }
}

export const twilioService = new TwilioService();
