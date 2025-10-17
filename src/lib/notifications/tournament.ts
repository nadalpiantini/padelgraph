/**
 * Tournament Notifications Service
 *
 * Handles all 8 notification triggers for tournaments:
 * 1. Tournament published
 * 2. Registration confirmed
 * 3. Check-in opens
 * 4. Tournament starts
 * 5. Round starts
 * 6. Match assigned
 * 7. Score submitted
 * 8. Tournament ends
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { twilioService } from '@/lib/twilio';
import { emailService } from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

/**
 * 1. Tournament Published - Notify org members
 */
export async function notifyTournamentPublished(tournamentId: string) {
  const supabase = await createClient();

  // Get tournament details
  const { data: tournament } = await supabase
    .from('tournament')
    .select('*, organization!inner(name)')
    .eq('id', tournamentId)
    .single();

  if (!tournament) return;

  // Get org members
  const { data: orgMembers } = await supabase
    .from('org_member')
    .select('user_profile!inner(email, full_name, phone)')
    .eq('org_id', tournament.org_id);

  if (!orgMembers || orgMembers.length === 0) return;

  const emails = orgMembers.map((m: any) => m.user_profile.email);

  // Send email notification
  await emailService.send({
    to: emails,
    subject: `Nuevo Torneo Publicado: ${tournament.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>🏆 Nuevo Torneo Publicado</h1>
        <p>Un nuevo torneo está disponible en ${tournament.organization.name}:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Nombre:</strong> ${tournament.name}</p>
          <p><strong>Tipo:</strong> ${tournament.type}</p>
          <p><strong>Fecha:</strong> ${new Date(tournament.starts_at).toLocaleString('es-ES')}</p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/tournaments/${tournament.id}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px;">
          Ver Detalles
        </a>
      </div>
    `,
  });

  console.log(`[Notifications] Tournament published notification sent for ${tournamentId}`);
}

/**
 * 2. Registration Confirmed - WhatsApp + Email
 */
export async function notifyRegistrationConfirmed(
  tournamentId: string,
  userId: string
) {
  const supabase = await createClient();

  // Get tournament and user details
  const { data: tournament } = await supabase
    .from('tournament')
    .select('*')
    .eq('id', tournamentId)
    .single();

  const { data: profile } = await supabase
    .from('user_profile')
    .select('full_name, email, phone')
    .eq('user_id', userId)
    .single();

  if (!tournament || !profile) return;

  // WhatsApp notification
  await twilioService.sendWhatsApp({
    to: profile.phone,
    body: `🏆 ¡Registro Confirmado!

Estás inscrito en: ${tournament.name}
Fecha: ${new Date(tournament.starts_at).toLocaleDateString('es-ES')}

No olvides hacer check-in antes del inicio. ¡Nos vemos en la cancha! 🎾`,
  });

  // Email confirmation
  await emailService.send({
    to: profile.email,
    subject: `Registro Confirmado - ${tournament.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>✅ Registro Confirmado</h1>
        <p>Hola ${profile.full_name},</p>
        <p>Tu registro en el torneo ha sido confirmado:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Torneo:</strong> ${tournament.name}</p>
          <p><strong>Tipo:</strong> ${tournament.type}</p>
          <p><strong>Fecha:</strong> ${new Date(tournament.starts_at).toLocaleString('es-ES')}</p>
        </div>
        <p><strong>Importante:</strong> Recuerda hacer check-in antes del inicio del torneo.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/tournaments/${tournament.id}" style="display: inline-block; padding: 12px 24px; background: #22c55e; color: white; text-decoration: none; border-radius: 6px;">
          Ver Torneo
        </a>
      </div>
    `,
  });

  console.log(`[Notifications] Registration confirmed for user ${userId} in tournament ${tournamentId}`);
}

/**
 * 3. Check-in Opens - WhatsApp reminder to all registered
 */
export async function notifyCheckInOpens(tournamentId: string) {
  const supabase = await createClient();

  // Get tournament
  const { data: tournament } = await supabase
    .from('tournament')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (!tournament) return;

  // Get all registered participants
  const { data: participants } = await supabase
    .from('tournament_participant')
    .select('user_profile!inner(phone, full_name)')
    .eq('tournament_id', tournamentId)
    .eq('status', 'registered');

  if (!participants || participants.length === 0) return;

  // Send WhatsApp to all
  await Promise.all(
    participants.map((p: any) =>
      twilioService.sendWhatsApp({
        to: p.user_profile.phone,
        body: `🎾 ¡Check-in Abierto!

${tournament.name} está a punto de comenzar.

Haz check-in ahora desde la app para confirmar tu participación.

📍 Debes estar en el lugar del torneo para hacer check-in.`,
      })
    )
  );

  console.log(`[Notifications] Check-in reminder sent to ${participants.length} participants`);
}

/**
 * 4. Tournament Starts - WhatsApp + Email to all checked-in
 */
export async function notifyTournamentStarts(tournamentId: string) {
  const supabase = await createClient();

  // Get tournament
  const { data: tournament } = await supabase
    .from('tournament')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (!tournament) return;

  // Get checked-in participants
  const { data: participants } = await supabase
    .from('tournament_participant')
    .select('user_profile!inner(phone, email, full_name)')
    .eq('tournament_id', tournamentId)
    .eq('status', 'checked_in');

  if (!participants || participants.length === 0) return;

  // WhatsApp bulk send
  await Promise.all(
    participants.map((p: any) =>
      twilioService.sendWhatsApp({
        to: p.user_profile.phone,
        body: `🏆 ¡${tournament.name} comienza ahora!

Ve al rotation board para ver tu primer partido.

${process.env.NEXT_PUBLIC_APP_URL}/tournaments/${tournamentId}/board

¡Buena suerte! 🎾`,
      })
    )
  );

  // Email backup
  const emails = participants.map((p: any) => p.user_profile.email);
  await emailService.send({
    to: emails,
    subject: `${tournament.name} - ¡Comienza Ahora!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>🏆 ¡El Torneo Comienza!</h1>
        <h2>${tournament.name}</h2>
        <p>El torneo ha comenzado. Ve al rotation board para ver tu primer partido.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/tournaments/${tournamentId}/board" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Ver Rotation Board
        </a>
        <p style="margin-top: 30px;">¡Buena suerte! 🎾</p>
      </div>
    `,
  });

  console.log(`[Notifications] Tournament start notification sent to ${participants.length} participants`);
}

/**
 * 5. Round Starts - WhatsApp to match participants
 */
export async function notifyRoundStarts(
  tournamentId: string,
  roundNumber: number
) {
  const supabase = await createClient();

  // Get round
  const { data: round } = await supabase
    .from('tournament_round')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round_number', roundNumber)
    .single();

  if (!round) return;

  // Get all matches in this round
  const { data: matches } = await supabase
    .from('tournament_match')
    .select(`
      *,
      court!inner(name),
      team1_player1:user_profile!team1_player1_id(phone),
      team1_player2:user_profile!team1_player2_id(phone),
      team2_player1:user_profile!team2_player1_id(phone),
      team2_player2:user_profile!team2_player2_id(phone)
    `)
    .eq('round_id', round.id);

  if (!matches || matches.length === 0) return;

  // Send WhatsApp to all players in matches
  await Promise.all(
    matches.flatMap((match: any) => [
      twilioService.sendWhatsApp({
        to: match.team1_player1.phone,
        body: `🎾 ¡Tu partido está listo!

Ronda ${roundNumber}
Cancha: ${match.court.name}

Ve al rotation board para ver los detalles.

¡Buena suerte!`,
      }),
      twilioService.sendWhatsApp({
        to: match.team1_player2.phone,
        body: `🎾 ¡Tu partido está listo!

Ronda ${roundNumber}
Cancha: ${match.court.name}

Ve al rotation board para ver los detalles.

¡Buena suerte!`,
      }),
      twilioService.sendWhatsApp({
        to: match.team2_player1.phone,
        body: `🎾 ¡Tu partido está listo!

Ronda ${roundNumber}
Cancha: ${match.court.name}

Ve al rotation board para ver los detalles.

¡Buena suerte!`,
      }),
      twilioService.sendWhatsApp({
        to: match.team2_player2.phone,
        body: `🎾 ¡Tu partido está listo!

Ronda ${roundNumber}
Cancha: ${match.court.name}

Ve al rotation board para ver los detalles.

¡Buena suerte!`,
      }),
    ])
  );

  console.log(`[Notifications] Round ${roundNumber} start notifications sent`);
}

/**
 * 6. Match Assigned - WhatsApp to 4 players
 */
export async function notifyMatchAssigned(matchId: string) {
  const supabase = await createClient();

  // Get match details
  const { data: match } = await supabase
    .from('tournament_match')
    .select(`
      *,
      court!inner(name),
      tournament_round!inner(round_number, tournament!inner(name)),
      team1_player1:user_profile!team1_player1_id(phone, full_name),
      team1_player2:user_profile!team1_player2_id(phone, full_name),
      team2_player1:user_profile!team2_player1_id(phone, full_name),
      team2_player2:user_profile!team2_player2_id(phone, full_name)
    `)
    .eq('id', matchId)
    .single();

  if (!match) return;

  const roundNumber = (match.tournament_round as any).round_number;
  const tournamentName = (match.tournament_round as any).tournament.name;

  // Send to team 1
  await Promise.all([
    twilioService.sendWhatsApp({
      to: (match.team1_player1 as any).phone,
      body: `🎾 Partido Asignado - ${tournamentName}

Ronda ${roundNumber}
Cancha: ${(match.court as any).name}

Tu compañero: ${(match.team1_player2 as any).full_name}
Rivales: ${(match.team2_player1 as any).full_name} & ${(match.team2_player2 as any).full_name}

¡A ganar! 💪`,
    }),
    twilioService.sendWhatsApp({
      to: (match.team1_player2 as any).phone,
      body: `🎾 Partido Asignado - ${tournamentName}

Ronda ${roundNumber}
Cancha: ${(match.court as any).name}

Tu compañero: ${(match.team1_player1 as any).full_name}
Rivales: ${(match.team2_player1 as any).full_name} & ${(match.team2_player2 as any).full_name}

¡A ganar! 💪`,
    }),
  ]);

  // Send to team 2
  await Promise.all([
    twilioService.sendWhatsApp({
      to: (match.team2_player1 as any).phone,
      body: `🎾 Partido Asignado - ${tournamentName}

Ronda ${roundNumber}
Cancha: ${(match.court as any).name}

Tu compañero: ${(match.team2_player2 as any).full_name}
Rivales: ${(match.team1_player1 as any).full_name} & ${(match.team1_player2 as any).full_name}

¡A ganar! 💪`,
    }),
    twilioService.sendWhatsApp({
      to: (match.team2_player2 as any).phone,
      body: `🎾 Partido Asignado - ${tournamentName}

Ronda ${roundNumber}
Cancha: ${(match.court as any).name}

Tu compañero: ${(match.team2_player1 as any).full_name}
Rivales: ${(match.team1_player1 as any).full_name} & ${(match.team1_player2 as any).full_name}

¡A ganar! 💪`,
    }),
  ]);

  console.log(`[Notifications] Match assignment sent for match ${matchId}`);
}

/**
 * 7. Score Submitted - WhatsApp to 4 players
 */
export async function notifyScoreSubmitted(matchId: string) {
  const supabase = await createClient();

  // Get match details
  const { data: match } = await supabase
    .from('tournament_match')
    .select(`
      *,
      court!inner(name),
      tournament_round!inner(round_number),
      team1_player1:user_profile!team1_player1_id(phone, full_name),
      team1_player2:user_profile!team1_player2_id(phone, full_name),
      team2_player1:user_profile!team2_player1_id(phone, full_name),
      team2_player2:user_profile!team2_player2_id(phone, full_name)
    `)
    .eq('id', matchId)
    .single();

  if (!match) return;

  const winner = match.team1_score! > match.team2_score! ? 'Team 1' : 'Team 2';
  const roundNumber = (match.tournament_round as any).round_number;

  const message = `✅ Resultado Registrado

Ronda ${roundNumber} - ${(match.court as any).name}

${(match.team1_player1 as any).full_name} & ${(match.team1_player2 as any).full_name}
${match.team1_score} - ${match.team2_score}
${(match.team2_player1 as any).full_name} & ${(match.team2_player2 as any).full_name}

${match.is_draw ? '¡Empate!' : `¡Ganó ${winner}!`}

Revisa la tabla de posiciones actualizada en la app. 🏆`;

  // Send to all 4 players
  await Promise.all([
    twilioService.sendWhatsApp({ to: (match.team1_player1 as any).phone, body: message }),
    twilioService.sendWhatsApp({ to: (match.team1_player2 as any).phone, body: message }),
    twilioService.sendWhatsApp({ to: (match.team2_player1 as any).phone, body: message }),
    twilioService.sendWhatsApp({ to: (match.team2_player2 as any).phone, body: message }),
  ]);

  console.log(`[Notifications] Score submitted notification sent for match ${matchId}`);
}

/**
 * 8. Tournament Ends - Email to all participants
 */
export async function notifyTournamentEnds(tournamentId: string) {
  const supabase = await createClient();

  // Get tournament
  const { data: tournament } = await supabase
    .from('tournament')
    .select('*')
    .eq('id', tournamentId)
    .single();

  if (!tournament) return;

  // Get all participants
  const { data: participants } = await supabase
    .from('tournament_participant')
    .select('user_profile!inner(email, full_name)')
    .eq('tournament_id', tournamentId);

  if (!participants || participants.length === 0) return;

  // Get final standings
  const { data: standings } = await supabase
    .from('tournament_standing')
    .select('*, user_profile!inner(full_name)')
    .eq('tournament_id', tournamentId)
    .order('rank', { ascending: true })
    .limit(3);

  const standingsHTML = standings
    ?.map(
      (s: any, i: number) => `
      <tr style="background: ${i === 0 ? '#fef3c7' : i === 1 ? '#e5e7eb' : '#fed7aa'};">
        <td style="padding: 12px;">${['🥇', '🥈', '🥉'][i]}</td>
        <td style="padding: 12px;">${s.user_profile.full_name}</td>
        <td style="padding: 12px; text-align: center;">${s.points}</td>
      </tr>
    `
    )
    .join('');

  const emails = participants.map((p: any) => p.user_profile.email);

  await emailService.send({
    to: emails,
    subject: `${tournament.name} - ¡Torneo Finalizado!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>🏆 ¡Torneo Finalizado!</h1>
        <h2>${tournament.name}</h2>
        <p>¡Gracias por participar! Aquí están los ganadores:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left;">Pos</th>
              <th style="padding: 12px; text-align: left;">Jugador</th>
              <th style="padding: 12px; text-align: center;">Puntos</th>
            </tr>
          </thead>
          <tbody>
            ${standingsHTML}
          </tbody>
        </table>

        <a href="${process.env.NEXT_PUBLIC_APP_URL}/tournaments/${tournamentId}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          Ver Clasificación Completa
        </a>

        <p style="margin-top: 30px;">¡Nos vemos en el próximo torneo! 🎾</p>
      </div>
    `,
  });

  console.log(`[Notifications] Tournament end notification sent to ${participants.length} participants`);
}
