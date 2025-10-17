/**
 * Permission helpers for admin operations
 * Sprint 1 - Phase 6: Admin Panel
 */

import { createClient } from '@/lib/supabase/server';
import type { OrgMember } from '@/types/database';

/**
 * Check if user is admin or owner of an organization
 */
export async function checkOrgAdmin(
  userId: string,
  orgId: string
): Promise<{ isAdmin: boolean; role?: OrgMember['role']; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('org_member')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return { isAdmin: false, error: 'Not a member of this organization' };
  }

  const isAdmin = data.role === 'admin' || data.role === 'owner';

  return {
    isAdmin,
    role: data.role,
    error: isAdmin ? undefined : 'Insufficient permissions (admin or owner required)',
  };
}

/**
 * Check if user is owner of an organization
 */
export async function checkOrgOwner(
  userId: string,
  orgId: string
): Promise<{ isOwner: boolean; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('org_member')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return { isOwner: false, error: 'Not a member of this organization' };
  }

  const isOwner = data.role === 'owner';

  return {
    isOwner,
    error: isOwner ? undefined : 'Insufficient permissions (owner required)',
  };
}

/**
 * Check if user has admin/owner access to a specific court
 */
export async function checkCourtAccess(
  userId: string,
  courtId: string
): Promise<{ hasAccess: boolean; orgId?: string; error?: string }> {
  const supabase = await createClient();

  // Get court's organization
  const { data: court, error: courtError } = await supabase
    .from('court')
    .select('org_id')
    .eq('id', courtId)
    .single();

  if (courtError || !court) {
    return { hasAccess: false, error: 'Court not found' };
  }

  // Check if user is admin/owner of that org
  const { isAdmin, error } = await checkOrgAdmin(userId, court.org_id);

  return {
    hasAccess: isAdmin,
    orgId: court.org_id,
    error,
  };
}

/**
 * Check if user has any organization memberships
 */
export async function getUserOrganizations(
  userId: string
): Promise<{ organizations: { org_id: string; role: OrgMember['role'] }[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('org_member')
    .select('org_id, role')
    .eq('user_id', userId);

  if (error) {
    return { organizations: [], error: 'Failed to fetch user organizations' };
  }

  return { organizations: data || [] };
}

/**
 * Get admin organizations (where user is admin or owner)
 */
export async function getAdminOrganizations(
  userId: string
): Promise<{ organizations: { org_id: string; role: OrgMember['role'] }[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('org_member')
    .select('org_id, role')
    .eq('user_id', userId)
    .in('role', ['admin', 'owner']);

  if (error) {
    return { organizations: [], error: 'Failed to fetch admin organizations' };
  }

  return { organizations: data || [] };
}
