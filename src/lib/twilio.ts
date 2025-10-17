/**
 * Twilio Service - WhatsApp and SMS Communication
 * To be implemented in Sprint 1
 */

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
  // Configuration will be implemented in Sprint 1
  constructor() {
    // Placeholder for future implementation
  }

  /**
   * Send WhatsApp message
   * @stub - To be implemented in Sprint 1
   */
  async sendWhatsApp(params: SendMessageParams): Promise<TwilioResponse> {
    console.log('[Twilio] WhatsApp send stub called:', params);
    return {
      success: false,
      error: 'Twilio WhatsApp not implemented yet',
    };
  }

  /**
   * Send SMS message
   * @stub - To be implemented in Sprint 1
   */
  async sendSMS(params: SendMessageParams): Promise<TwilioResponse> {
    console.log('[Twilio] SMS send stub called:', params);
    return {
      success: false,
      error: 'Twilio SMS not implemented yet',
    };
  }
}

export const twilioService = new TwilioService();
