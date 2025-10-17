/**
 * Admin Dashboard API endpoint
 * GET /api/admin/dashboard - Get organization statistics and metrics
 */
import { createClient } from '@/lib/supabase/server';
import {
  errorResponse,
  serverErrorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/api-response';
import { checkOrgAdmin } from '@/lib/permissions';
import { z } from 'zod';

const dashboardQuerySchema = z.object({
  org_id: z.string().uuid('Invalid organization ID'),
});

export async function GET(request: Request) {
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

    // Parse and validate query params
    const { searchParams } = new URL(request.url);
    const queryParams = {
      org_id: searchParams.get('org_id'),
    };

    const validation = dashboardQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return errorResponse('Invalid query parameters', validation.error.issues);
    }

    const { org_id } = validation.data;

    // Check if user is admin/owner of the organization
    const { isAdmin, error: permError } = await checkOrgAdmin(user.id, org_id);

    if (!isAdmin) {
      return errorResponse(permError || 'Insufficient permissions', [], 403);
    }

    // Get current date and time boundaries
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Fetch all metrics in parallel
    const [courtsResult, bookingsTodayResult, bookingsWeekResult, bookingsMonthResult, upcomingResult] =
      await Promise.all([
        // Courts count and active count
        supabase
          .from('court')
          .select('id, active', { count: 'exact' })
          .eq('org_id', org_id),

        // Bookings today
        supabase
          .from('booking')
          .select('id, total_price, status', { count: 'exact' })
          .eq('org_id', org_id)
          .gte('start_at', today.toISOString())
          .lt('start_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()),

        // Bookings this week
        supabase
          .from('booking')
          .select('id, total_price, status', { count: 'exact' })
          .eq('org_id', org_id)
          .gte('start_at', weekAgo.toISOString()),

        // Bookings this month
        supabase
          .from('booking')
          .select('id, total_price, status', { count: 'exact' })
          .eq('org_id', org_id)
          .gte('start_at', monthAgo.toISOString()),

        // Upcoming bookings (next 7 days)
        supabase
          .from('booking')
          .select(
            `
            id,
            start_at,
            end_at,
            status,
            total_price,
            user:user_profile (
              id,
              name,
              email
            ),
            court:court (
              id,
              name
            )
          `
          )
          .eq('org_id', org_id)
          .gte('start_at', now.toISOString())
          .lte('start_at', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
          .in('status', ['pending', 'confirmed'])
          .order('start_at', { ascending: true })
          .limit(10),
      ]);

    // Check for errors
    if (courtsResult.error) {
      console.error('[Dashboard API] Error fetching courts:', courtsResult.error);
      return serverErrorResponse('Failed to fetch courts data', courtsResult.error);
    }

    if (bookingsTodayResult.error) {
      console.error('[Dashboard API] Error fetching today bookings:', bookingsTodayResult.error);
      return serverErrorResponse('Failed to fetch bookings data', bookingsTodayResult.error);
    }

    if (bookingsWeekResult.error) {
      console.error('[Dashboard API] Error fetching week bookings:', bookingsWeekResult.error);
      return serverErrorResponse('Failed to fetch bookings data', bookingsWeekResult.error);
    }

    if (bookingsMonthResult.error) {
      console.error('[Dashboard API] Error fetching month bookings:', bookingsMonthResult.error);
      return serverErrorResponse('Failed to fetch bookings data', bookingsMonthResult.error);
    }

    if (upcomingResult.error) {
      console.error('[Dashboard API] Error fetching upcoming bookings:', upcomingResult.error);
      return serverErrorResponse('Failed to fetch upcoming bookings', upcomingResult.error);
    }

    // Calculate metrics
    const courts = courtsResult.data || [];
    const activeCourts = courts.filter((c) => c.active).length;

    const bookingsToday = bookingsTodayResult.data || [];
    const bookingsWeek = bookingsWeekResult.data || [];
    const bookingsMonth = bookingsMonthResult.data || [];

    type BookingData = {
      id: string;
      total_price: number;
      status: string;
    };

    const calculateRevenue = (bookings: BookingData[]) => {
      return bookings
        .filter((b) => ['confirmed', 'completed'].includes(b.status))
        .reduce((sum, b) => sum + parseFloat(String(b.total_price || 0)), 0);
    };

    const calculateProjectedRevenue = (bookings: BookingData[]) => {
      return bookings
        .filter((b) => b.status === 'pending')
        .reduce((sum, b) => sum + parseFloat(String(b.total_price || 0)), 0);
    };

    const revenueToday = calculateRevenue(bookingsToday);
    const revenueWeek = calculateRevenue(bookingsWeek);
    const revenueMonth = calculateRevenue(bookingsMonth);

    const projectedToday = calculateProjectedRevenue(bookingsToday);
    const projectedWeek = calculateProjectedRevenue(bookingsWeek);
    const projectedMonth = calculateProjectedRevenue(bookingsMonth);

    // Calculate occupancy rate (simplified - bookings today / total possible slots)
    // Simplified: assume 10 slots per court per day
    const totalSlots = activeCourts * 10;
    const occupancyRate = totalSlots > 0 ? (bookingsToday.length / totalSlots) * 100 : 0;

    // Build response
    const dashboard = {
      courts: {
        total: courts.length,
        active: activeCourts,
      },
      bookings: {
        today: {
          count: bookingsTodayResult.count || 0,
          confirmed: bookingsToday.filter((b) => b.status === 'confirmed').length,
          pending: bookingsToday.filter((b) => b.status === 'pending').length,
          cancelled: bookingsToday.filter((b) => b.status === 'cancelled').length,
        },
        week: {
          count: bookingsWeekResult.count || 0,
          confirmed: bookingsWeek.filter((b) => b.status === 'confirmed').length,
          pending: bookingsWeek.filter((b) => b.status === 'pending').length,
        },
        month: {
          count: bookingsMonthResult.count || 0,
          confirmed: bookingsMonth.filter((b) => b.status === 'confirmed').length,
          pending: bookingsMonth.filter((b) => b.status === 'pending').length,
        },
      },
      revenue: {
        today: {
          confirmed: revenueToday,
          projected: projectedToday,
          total: revenueToday + projectedToday,
        },
        week: {
          confirmed: revenueWeek,
          projected: projectedWeek,
          total: revenueWeek + projectedWeek,
        },
        month: {
          confirmed: revenueMonth,
          projected: projectedMonth,
          total: revenueMonth + projectedMonth,
        },
      },
      occupancy: {
        rate: Math.round(occupancyRate * 100) / 100, // Round to 2 decimals
        total_slots: totalSlots,
        booked_slots: bookingsToday.length,
      },
      upcoming_bookings: upcomingResult.data || [],
    };

    return successResponse(dashboard);
  } catch (error) {
    console.error('[Dashboard API] Unexpected error:', error);
    return serverErrorResponse('Unexpected error occurred', error);
  }
}
