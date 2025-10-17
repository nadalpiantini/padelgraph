/**
 * Court Availability API endpoint
 * GET /api/courts/[id]/availability - Get available time slots for a specific date
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  notFoundResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { z } from 'zod';

const availabilityParamsSchema = z.object({
  id: z.string().uuid('Invalid court ID'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  price_per_hour: number;
  is_available: boolean;
  booking_id?: string;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const supabase = await createClient();
    const { id } = await params;
    const { searchParams } = new URL(request.url);

    // Validate params
    const validation = availabilityParamsSchema.safeParse({
      id,
      date: searchParams.get('date'),
    });

    if (!validation.success) {
      return errorResponse('Invalid parameters', validation.error.issues);
    }

    const { date } = validation.data;

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return unauthorizedResponse('Not authenticated');
    }

    // Check if court exists
    const { data: court, error: courtError } = await supabase
      .from('court')
      .select('id, name, active')
      .eq('id', id)
      .single();

    if (courtError || !court) {
      return notFoundResponse('Court');
    }

    if (!court.active) {
      return errorResponse('Court is not active', undefined, 400);
    }

    // Determine day of week if date is provided
    let dayOfWeek: number | undefined;
    let targetDate: Date | undefined;

    if (date) {
      targetDate = new Date(date);
      dayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday
    }

    // Get availability schedule for this court
    let availabilityQuery = supabase
      .from('availability')
      .select('*')
      .eq('court_id', id)
      .eq('active', true)
      .order('day_of_week')
      .order('start_time');

    if (dayOfWeek !== undefined) {
      availabilityQuery = availabilityQuery.eq('day_of_week', dayOfWeek);
    }

    const { data: availabilitySlots, error: availError } = await availabilityQuery;

    if (availError) {
      console.error('[Availability API] Error fetching availability:', availError);
      return serverErrorResponse('Failed to fetch availability', availError);
    }

    // If a specific date is requested, check for existing bookings
    if (date && availabilitySlots && availabilitySlots.length > 0) {
      const startOfDay = `${date}T00:00:00Z`;
      const endOfDay = `${date}T23:59:59Z`;

      // Get all bookings for this court on the specified date
      const { data: bookings, error: bookingsError } = await supabase
        .from('booking')
        .select('id, start_at, end_at')
        .eq('court_id', id)
        .in('status', ['pending', 'confirmed'])
        .gte('start_at', startOfDay)
        .lte('start_at', endOfDay);

      if (bookingsError) {
        console.error('[Availability API] Error fetching bookings:', bookingsError);
        return serverErrorResponse('Failed to check bookings', bookingsError);
      }

      // Mark slots as unavailable if they overlap with bookings
      const slotsWithAvailability: AvailabilitySlot[] = availabilitySlots.map((slot) => {
        // Convert slot times to full datetime for comparison
        const slotStart = new Date(`${date}T${slot.start_time}`);
        const slotEnd = new Date(`${date}T${slot.end_time}`);

        // Check if any booking overlaps with this slot
        const hasConflict = bookings?.some((booking) => {
          const bookingStart = new Date(booking.start_at);
          const bookingEnd = new Date(booking.end_at);

          return (
            (bookingStart < slotEnd && bookingEnd > slotStart) || // Overlaps
            (bookingStart >= slotStart && bookingEnd <= slotEnd) // Fully contained
          );
        });

        return {
          day_of_week: slot.day_of_week,
          start_time: slot.start_time,
          end_time: slot.end_time,
          price_per_hour: slot.price_per_hour,
          is_available: !hasConflict,
          ...(hasConflict && { booking_id: bookings?.find((b) => {
            const bookingStart = new Date(b.start_at);
            const bookingEnd = new Date(b.end_at);
            const slotStart = new Date(`${date}T${slot.start_time}`);
            const slotEnd = new Date(`${date}T${slot.end_time}`);
            return bookingStart < slotEnd && bookingEnd > slotStart;
          })?.id }),
        };
      });

      return successResponse({
        court_id: id,
        court_name: court.name,
        date,
        day_of_week: dayOfWeek,
        slots: slotsWithAvailability,
      });
    }

    // Return just the schedule without availability check
    return successResponse({
      court_id: id,
      court_name: court.name,
      ...(date && { date, day_of_week: dayOfWeek }),
      slots: availabilitySlots || [],
    });
  } catch (error) {
    console.error('[Availability API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
