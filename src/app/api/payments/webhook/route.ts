/**
 * PayPal Webhook Handler
 * POST /api/payments/webhook
 *
 * Receives notifications from PayPal when payment events occur
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { paypalService } from '@/lib/paypal';
import { paypalWebhookSchema } from '@/lib/validations/payment';

export async function POST(request: Request) {
  try {
    // Get headers for webhook verification
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Get raw body
    const body = await request.text();

    // Verify webhook signature
    const isValid = await paypalService.verifyWebhookSignature(headers, body);

    if (!isValid) {
      console.error('[Webhook] Invalid PayPal signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook event
    const event = JSON.parse(body);
    const validation = paypalWebhookSchema.safeParse(event);

    if (!validation.success) {
      console.error('[Webhook] Invalid webhook payload:', validation.error);
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Handle the webhook
    const result = await paypalService.handleWebhook(validation.data);

    if (!result.success || !result.bookingId) {
      console.error('[Webhook] Webhook processing failed:', result.error);
      return NextResponse.json({ error: result.error || 'Processing failed' }, { status: 400 });
    }

    // Update booking status based on payment status
    if (result.status === 'completed') {
      const supabase = await createClient();

      const { error: updateError } = await supabase
        .from('booking')
        .update({
          status: 'confirmed',
        })
        .eq('id', result.bookingId);

      if (updateError) {
        console.error('[Webhook] Failed to update booking:', updateError);
        // Don't fail webhook - log and continue
      }
    }

    // Acknowledge webhook
    return NextResponse.json({ received: true, status: result.status }, { status: 200 });
  } catch (error) {
    console.error('[Webhook] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
