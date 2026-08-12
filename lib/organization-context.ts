import type { SupabaseClient } from "@supabase/supabase-js";

export type OrganizationRole = "owner" | "admin" | "manager" | "member";

export type OrganizationContext = {
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
};

type OrganizationRecord = { name?: string; status?: string; contract_start?: string | null; contract_end?: string | null };

function isLicenseAllowed(organization?: OrganizationRecord | null) {
  if (!organization || organization.status !== "active") return false;
  const today = new Date().toISOString().slice(0, 10);
  return (!organization.contract_start || organization.contract_start <= today) && (!organization.contract_end || organization.contract_end >= today);
}

export async function resolveOrganizationContext(
  supabase: SupabaseClient,
  userId: string,
  email: string | null,
): Promise<OrganizationContext | null> {
  const membership = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations(name,status,contract_start,contract_end)")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membership.data) {
    const organization = Array.isArray(membership.data.organizations)
      ? membership.data.organizations[0]
      : membership.data.organizations;
    if (!isLicenseAllowed(organization as OrganizationRecord)) return null;
    return {
      organizationId: membership.data.organization_id,
      organizationName: organization?.name ?? "Empresa",
      role: membership.data.role as OrganizationRole,
    };
  }

  if (membership.error) {
    console.error("[organization-context] membership lookup failed", membership.error);
    return null;
  }

  const normalizedEmail = email?.trim().toLowerCase() ?? "";
  const pendingInvite = normalizedEmail
    ? await supabase
        .from("organization_invites")
        .select("id, organization_id, role, organizations(name,status,contract_start,contract_end)")
        .eq("email", normalizedEmail)
        .eq("status", "pending")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle()
    : { data: null, error: null };

  if (pendingInvite.data) {
    const invitedOrganization = Array.isArray(pendingInvite.data.organizations) ? pendingInvite.data.organizations[0] : pendingInvite.data.organizations;
    if (!isLicenseAllowed(invitedOrganization as OrganizationRecord)) return null;
    const accepted = await supabase.from("organization_members").insert({
      organization_id: pendingInvite.data.organization_id,
      user_id: userId,
      role: pendingInvite.data.role,
      status: "active",
    });
    if (accepted.error) throw accepted.error;
    await supabase.from("organization_invites").update({ status: "accepted" }).eq("id", pendingInvite.data.id);
    const organization = invitedOrganization;
    return {
      organizationId: pendingInvite.data.organization_id,
      organizationName: organization?.name ?? "Empresa",
      role: pendingInvite.data.role as OrganizationRole,
    };
  }

  return null;
}
