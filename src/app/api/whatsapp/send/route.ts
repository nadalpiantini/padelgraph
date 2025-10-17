/**
 * WhatsApp API endpoint
 * POST /api/whatsapp/send - Send WhatsApp message
 */
import { twilioService } from '@/lib/twilio';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const sendWhatsAppSchema = z.object({
  to: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  body: z.string().min(1).max(1600), // WhatsApp message length limit
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = sendWhatsAppSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request data', validation.error.issues);
    }

    // Send WhatsApp message
    const result = await twilioService.sendWhatsApp({
      to: validation.data.to,
      body: validation.data.body,
    });

    if (!result.success) {
      return serverErrorResponse('Failed to send WhatsApp message', result.error);
    }

    return successResponse(
      { messageId: result.messageId },
      'WhatsApp message sent successfully'
    );
  } catch (error) {
    console.error('[WhatsApp API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
