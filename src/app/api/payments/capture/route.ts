/**
 * Capture PayPal Payment
 * POST /api/payments/capture
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { capturePaymentSchema } from '@/lib/validations/payment';
import { paypalService } from '@/lib/paypal';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = capturePaymentSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid capture data', validation.error.issues);
    }

    const { orderId, bookingId } = validation.data;

    // Verify booking exists and belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from('booking')
      .select('id, user_id, status')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single();

    if (bookingError || !booking) {
      return notFoundResponse('Booking');
    }

    // Check if booking is already completed
    if (booking.status === 'completed') {
      return errorResponse('Payment already captured', [], 400);
    }

    // Capture payment with PayPal
    const captureResult = await paypalService.capturePayment({ orderId });

    if (!captureResult.success) {
      console.error('[Payment API] PayPal capture failed:', captureResult.error);
      return serverErrorResponse('Failed to capture payment', captureResult.error);
    }

    // Update booking status to confirmed (payment completed)
    const { error: updateError } = await supabase
      .from('booking')
      .update({
        status: 'confirmed',
        notes: `PayPal Capture: ${captureResult.captureId} | Amount: ${captureResult.amount}`,
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[Payment API] Failed to update booking:', updateError);
      return serverErrorResponse('Payment captured but booking update failed', updateError);
    }

    return successResponse({
      captureId: captureResult.captureId,
      status: captureResult.status,
      amount: captureResult.amount,
      bookingStatus: 'confirmed',
      message: 'Payment captured successfully',
    });
  } catch (error) {
    console.error('[Payment API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
