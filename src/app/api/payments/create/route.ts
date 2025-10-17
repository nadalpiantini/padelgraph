/**
 * Create PayPal Payment Order
 * POST /api/payments/create
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { createPaymentOrderSchema } from '@/lib/validations/payment';
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
    const validation = createPaymentOrderSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid payment data', validation.error.issues);
    }

    const { bookingId, amount, currency, description } = validation.data;

    // Verify booking exists and belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from('booking')
      .select('id, user_id, status, total_price')
      .eq('id', bookingId)
      .eq('user_id', user.id)
      .single();

    if (bookingError || !booking) {
      return notFoundResponse('Booking');
    }

    // Check if booking is already paid or cancelled
    if (booking.status === 'completed') {
      return errorResponse('Booking already paid', [], 400);
    }

    if (booking.status === 'cancelled') {
      return errorResponse('Booking is cancelled', [], 400);
    }

    // Verify amount matches booking total
    const bookingAmount = parseFloat(String(booking.total_price));
    const requestAmount = parseFloat(amount);

    if (Math.abs(bookingAmount - requestAmount) > 0.01) {
      return errorResponse('Amount mismatch', [], 400);
    }

    // Create PayPal order
    const paypalResult = await paypalService.createOrder({
      amount,
      currency,
      bookingId,
      description: description || `Booking #${bookingId.substring(0, 8)}`,
    });

    if (!paypalResult.success || !paypalResult.orderId) {
      console.error('[Payment API] PayPal order creation failed:', paypalResult.error);
      return serverErrorResponse('Failed to create payment order', paypalResult.error);
    }

    // Update booking with payment info
    const { error: updateError } = await supabase
      .from('booking')
      .update({
        status: 'pending', // Payment pending
        notes: `PayPal Order: ${paypalResult.orderId}`,
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('[Payment API] Failed to update booking:', updateError);
      // Don't fail - order was created successfully
    }

    return successResponse({
      orderId: paypalResult.orderId,
      approvalUrl: paypalResult.approvalUrl,
      message: 'Payment order created successfully',
    });
  } catch (error) {
    console.error('[Payment API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
