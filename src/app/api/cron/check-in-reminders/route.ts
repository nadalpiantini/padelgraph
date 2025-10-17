/**
 * Cron Job: Check-In Reminders
 *
 * Runs every hour to send reminders to participants who haven't checked in
 * Triggers 2 hours before check-in closes
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import { emailService } from '@/lib/email';
import { whatsAppService } from '@/lib/whatsapp';

/**
 * GET /api/cron/check-in-reminders
 *
 * Automated cron job to send check-in reminders
 * Vercel Cron Authorization required
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return ApiResponse.error('Unauthorized', 401);
    }

    const supabase = await createClient();

    // Find tournaments with check-in closing in next 2 hours
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournament')
      .select('id, name, org_id, check_in_closes_at')
      .eq('status', 'published')
      .gte('check_in_closes_at', now.toISOString())
      .lte('check_in_closes_at', twoHoursFromNow.toISOString());

    if (tournamentsError) {
      console.error('Error fetching tournaments:', tournamentsError);
      return ApiResponse.error('Failed to fetch tournaments', 500);
    }

    if (!tournaments || tournaments.length === 0) {
      return ApiResponse.success(
        { sent: 0 },
        'No tournaments requiring reminders'
      );
    }

    let totalSent = 0;

    // Process each tournament
    for (const tournament of tournaments) {
      // Find participants who haven't checked in
      const { data: participants, error: participantsError } = await supabase
        .from('tournament_participant')
        .select(
          `
          user_id,
          profile:user_id (
            id,
            name,
            email,
            phone,
            preferences
          )
        `
        )
        .eq('tournament_id', tournament.id)
        .eq('status', 'registered'); // Only registered, not checked_in

      if (participantsError || !participants || participants.length === 0) {
        continue;
      }

      // Send reminders to each participant
      for (const participant of participants) {
        const profile = participant.profile as unknown as {
          id: string;
          name: string;
          email: string;
          phone?: string;
          preferences?: {
            notifications?: { email?: boolean; whatsapp?: boolean };
          };
        };

        if (!profile || !profile.email) continue;

        const timeUntilClose = tournament.check_in_closes_at
          ? Math.floor(
              (new Date(tournament.check_in_closes_at).getTime() -
                now.getTime()) /
                (60 * 1000)
            )
          : 0;

        const message = `¡Recordatorio de Check-In! El check-in para "${tournament.name}" cierra en ${timeUntilClose} minutos. Por favor realiza tu check-in lo antes posible.`;

        try {
          // Send email if enabled
          if (profile.preferences?.notifications?.email !== false) {
            await emailService.send({
              to: profile.email,
              subject: `Recordatorio: Check-In para ${tournament.name}`,
              text: message,
              html: `
                <h2>Recordatorio de Check-In</h2>
                <p>Hola ${profile.name || 'Jugador'},</p>
                <p>${message}</p>
                <p>¡Te esperamos!</p>
              `,
            });
          }

          // Send WhatsApp if enabled and phone available
          if (
            profile.phone &&
            profile.preferences?.notifications?.whatsapp !== false
          ) {
            await whatsAppService.send({
              to: profile.phone,
              message,
            });
          }

          totalSent++;
        } catch (notifError) {
          console.error(
            `Failed to send reminder to ${profile.email}:`,
            notifError
          );
          // Continue with other participants even if one fails
        }
      }
    }

    return ApiResponse.success(
      {
        sent: totalSent,
        tournaments: tournaments.length,
      },
      `Sent ${totalSent} check-in reminders`
    );
  } catch (error) {
    console.error('Check-in reminders cron error:', error);
    if (error instanceof Error) {
      return ApiResponse.error(error.message, 500);
    }
    return ApiResponse.error('Internal server error', 500);
  }
}
