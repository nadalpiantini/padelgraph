/**
 * Fair-Play Incident API - Individual Incident Scope
 *
 * PUT /api/fair-play/[id] - Update incident
 * DELETE /api/fair-play/[id] - Delete incident
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ApiResponse } from '@/lib/api-response';
import type { UpdateFairPlayIncidentRequest } from '@/types/database';

/**
 * PUT - Update Fair-Play Incident
 * 
 * Updates incident details. Penalty/bonus point changes will trigger
 * database trigger to update standings.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const incidentId = (await params).id;

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        ApiResponse.error('No autorizado', 401),
        { status: 401 }
      );
    }

    // Get incident and verify permissions
    const { data: incident, error: incidentError } = await supabase
      .from('tournament_fair_play')
      .select(`
        *,
        tournament:tournament_id (
          org_id,
          org_member!inner(role)
        )
      `)
      .eq('id', incidentId)
      .eq('tournament.org_member.user_id', user.id)
      .single();

    if (incidentError || !incident) {
      return NextResponse.json(
        ApiResponse.error('Incidente no encontrado', 404),
        { status: 404 }
      );
    }

    // Verify user is admin/owner or issuer
    const userRole = incident.tournament?.org_member?.role;
    const isIssuer = incident.issued_by === user.id;
    
    if (!['admin', 'owner'].includes(userRole) && !isIssuer) {
      return NextResponse.json(
        ApiResponse.error('No autorizado', 403),
        { status: 403 }
      );
    }

    // Parse request body
    const body: UpdateFairPlayIncidentRequest = await request.json();

    // Build update object
    const updateData: Partial<UpdateFairPlayIncidentRequest> = {};
    
    if (body.description !== undefined) updateData.description = body.description;
    if (body.severity !== undefined) updateData.severity = body.severity;
    if (body.penalty_points !== undefined) updateData.penalty_points = body.penalty_points;
    if (body.bonus_points !== undefined) updateData.bonus_points = body.bonus_points;

    // Note: If penalty/bonus points change, you may need to manually adjust standings
    // or implement a separate trigger/function for updates

    // Update incident
    const { data: updated, error: updateError } = await supabase
      .from('tournament_fair_play')
      .update(updateData)
      .eq('id', incidentId)
      .select(`
        *,
        user_profile:user_id (name, avatar_url),
        issuer_profile:issued_by (name, avatar_url)
      `)
      .single();

    if (updateError) {
      console.error('Error updating incident:', updateError);
      return NextResponse.json(
        ApiResponse.error('Error al actualizar incidente', 500),
        { status: 500 }
      );
    }

    return NextResponse.json(
      ApiResponse.success(updated, 'Incidente actualizado exitosamente'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in PUT /api/fair-play/[id]:', error);
    return NextResponse.json(
      ApiResponse.error('Error interno del servidor', 500),
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete Fair-Play Incident
 * 
 * Deletes incident. You may want to reverse the standing changes manually
 * or implement a deletion trigger.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const incidentId = (await params).id;

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        ApiResponse.error('No autorizado', 401),
        { status: 401 }
      );
    }

    // Get incident and verify permissions
    const { data: incident, error: incidentError } = await supabase
      .from('tournament_fair_play')
      .select(`
        *,
        tournament:tournament_id (
          org_id,
          org_member!inner(role)
        )
      `)
      .eq('id', incidentId)
      .eq('tournament.org_member.user_id', user.id)
      .single();

    if (incidentError || !incident) {
      return NextResponse.json(
        ApiResponse.error('Incidente no encontrado', 404),
        { status: 404 }
      );
    }

    // Only admin/owner can delete
    const userRole = incident.tournament?.org_member?.role;
    
    if (!['admin', 'owner'].includes(userRole)) {
      return NextResponse.json(
        ApiResponse.error('No autorizado - solo admins', 403),
        { status: 403 }
      );
    }

    // WARNING: Deleting incident doesn't reverse standing changes
    // You may want to manually adjust or implement deletion trigger
    
    // Delete incident
    const { error: deleteError } = await supabase
      .from('tournament_fair_play')
      .delete()
      .eq('id', incidentId);

    if (deleteError) {
      console.error('Error deleting incident:', deleteError);
      return NextResponse.json(
        ApiResponse.error('Error al eliminar incidente', 500),
        { status: 500 }
      );
    }

    return NextResponse.json(
      ApiResponse.success(null, 'Incidente eliminado exitosamente'),
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in DELETE /api/fair-play/[id]:', error);
    return NextResponse.json(
      ApiResponse.error('Error interno del servidor', 500),
      { status: 500 }
    );
  }
}
