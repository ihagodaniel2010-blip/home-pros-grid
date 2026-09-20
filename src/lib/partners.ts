import { supabase } from "./supabase";

export interface OrganizationPartner {
  id: string;
  organization_id: string;
  name: string;
  email?: string | null;
  ownership_percentage: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch all organization partners for a given organization ID.
 */
export async function getOrganizationPartners(orgId: string): Promise<OrganizationPartner[]> {
  if (!orgId) return [];

  try {
    const { data, error } = await supabase
      .from("organization_partners")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching organization_partners:", error);
      return [];
    }

    return (data || []).map((p: any) => ({
      ...p,
      ownership_percentage: Number(p.ownership_percentage || 0),
      active: Boolean(p.active)
    }));
  } catch (err) {
    console.error("Critical error in getOrganizationPartners:", err);
    return [];
  }
}

/**
 * Safe ordered save of company ownership structure & organization partners.
 * Sends ALL altered partners in a single bulk array upsert request.
 *
 * Execution order:
 * SINGLE_OWNER -> PARTNERSHIP or PARTNERSHIP -> PARTNERSHIP:
 * 1. Bulk upsert of all partners with total final 100% in a single array payload
 * 2. Update company_settings business_ownership_type to 'partnership'
 *
 * PARTNERSHIP -> SINGLE_OWNER:
 * 1. Update company_settings business_ownership_type to 'single_owner'
 * 2. Bulk upsert partner roster changes/deactivations (if any)
 */
export async function saveCompanyOwnershipStructure(
  orgId: string,
  ownershipType: 'single_owner' | 'partnership',
  partners: Partial<OrganizationPartner>[]
): Promise<{ success: boolean; error?: string }> {
  if (!orgId) return { success: false, error: "Missing Organization ID" };

  try {
    const payloadToUpsert = partners.map(p => ({
      ...(p.id && !p.id.startsWith("temp_") ? { id: p.id } : {}),
      organization_id: orgId,
      name: p.name?.trim() || "Partner",
      email: p.email?.trim() || null,
      ownership_percentage: Number(p.ownership_percentage || 0),
      active: p.active !== false,
      updated_at: new Date().toISOString()
    }));

    if (ownershipType === 'partnership') {
      const activePartners = partners.filter(p => p.active !== false);
      const totalPct = activePartners.reduce((sum, p) => sum + (Number(p.ownership_percentage) || 0), 0);
      
      if (Math.abs(totalPct - 100) > 0.01) {
        return {
          success: false,
          error: `Total Active Partner Ownership must equal EXACTLY 100.00%. Current active total: ${totalPct.toFixed(2)}%`
        };
      }

      // 1. Bulk upsert ALL partners in a SINGLE array payload request
      if (payloadToUpsert.length > 0) {
        const { error: partnerUpsertError } = await supabase
          .from("organization_partners")
          .upsert(payloadToUpsert);

        if (partnerUpsertError) {
          console.error("Error saving organization_partners bulk array:", partnerUpsertError);
          return { success: false, error: partnerUpsertError.message || "Failed to save partner records" };
        }
      }

      // 2. THEN update company_settings business_ownership_type to 'partnership'
      const { error: settingsError } = await supabase
        .from("company_settings")
        .upsert(
          {
            organization_id: orgId,
            business_ownership_type: "partnership",
            updated_at: new Date().toISOString()
          },
          { onConflict: "organization_id" }
        );

      if (settingsError) {
        console.error("Error updating company_settings to partnership:", settingsError);
        return { success: false, error: settingsError.message };
      }
    } else {
      // PARTNERSHIP -> SINGLE_OWNER mode:
      // 1. Update company_settings FIRST to single_owner
      const { error: settingsError } = await supabase
        .from("company_settings")
        .upsert(
          {
            organization_id: orgId,
            business_ownership_type: "single_owner",
            updated_at: new Date().toISOString()
          },
          { onConflict: "organization_id" }
        );

      if (settingsError) {
        console.error("Error updating company_settings to single_owner:", settingsError);
        return { success: false, error: settingsError.message };
      }

      // 2. THEN bulk upsert partner roster changes (if any) to preserve partner records without hard deletion
      if (payloadToUpsert.length > 0) {
        const { error: partnerUpsertError } = await supabase
          .from("organization_partners")
          .upsert(payloadToUpsert);

        if (partnerUpsertError) {
          console.error("Error saving organization_partners in single_owner mode:", partnerUpsertError);
          return { success: false, error: partnerUpsertError.message || "Failed to save partner records" };
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("Critical error in saveCompanyOwnershipStructure:", err);
    return { success: false, error: err.message || "Failed to save company ownership structure" };
  }
}
