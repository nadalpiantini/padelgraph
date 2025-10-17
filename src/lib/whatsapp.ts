/**
 * WhatsApp Service - Using Twilio
 * Implemented in Sprint 2
 */

import twilio from 'twilio';

interface SendWhatsAppParams {
  to: string; // Phone number with country code (e.g., +34612345678)
  message: string;
}

interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class WhatsAppService {
  private client: ReturnType<typeof twilio> | null = null;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio sandbox default

    if (accountSid && authToken) {
      this.client = twilio(accountSid, authToken);
    } else {
      console.warn('[WhatsApp] Twilio credentials not found - service disabled');
    }
  }

  /**
   * Send WhatsApp message via Twilio
   */
  async send(params: SendWhatsAppParams): Promise<WhatsAppResponse> {
    if (!this.client) {
      return {
        success: false,
        error: 'WhatsApp service not configured',
      };
    }

    try {
      const message = await this.client.messages.create({
        from: this.fromNumber,
        to: `whatsapp:${params.to}`,
        body: params.message,
      });

      console.log('[WhatsApp] Sent successfully:', message.sid);

      return {
        success: true,
        messageId: message.sid,
      };
    } catch (error) {
      console.error('[WhatsApp] Send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const whatsAppService = new WhatsAppService();
