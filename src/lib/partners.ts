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
 * Transactionally/atomically save company ownership structure & organization partners.
 * When partnership is selected, active partners MUST sum to exactly 100.00%.
 * Partners are saved FIRST to satisfy database triggers on company_settings.
 */
export async function saveCompanyOwnershipStructure(
  orgId: string,
  ownershipType: 'single_owner' | 'partnership',
  partners: Partial<OrganizationPartner>[]
): Promise<{ success: boolean; error?: string }> {
  if (!orgId) return { success: false, error: "Missing Organization ID" };

  try {
    if (ownershipType === 'partnership') {
      const activePartners = partners.filter(p => p.active !== false);
      const totalPct = activePartners.reduce((sum, p) => sum + (Number(p.ownership_percentage) || 0), 0);
      
      if (Math.abs(totalPct - 100) > 0.01) {
        return {
          success: false,
          error: `Total Active Partner Ownership must equal EXACTLY 100.00%. Current active total: ${totalPct.toFixed(2)}%`
        };
      }

      // Save/upsert organization_partners FIRST to satisfy DB trigger validate_company_ownership_mode
      const payloadToUpsert = partners.map(p => ({
        ...(p.id && !p.id.startsWith("temp_") ? { id: p.id } : {}),
        organization_id: orgId,
        name: p.name?.trim() || "Partner",
        email: p.email?.trim() || null,
        ownership_percentage: Number(p.ownership_percentage || 0),
        active: p.active !== false,
        updated_at: new Date().toISOString()
      }));

      if (payloadToUpsert.length > 0) {
        const { error: partnerUpsertError } = await supabase
          .from("organization_partners")
          .upsert(payloadToUpsert);

        if (partnerUpsertError) {
          console.error("Error saving organization_partners:", partnerUpsertError);
          return { success: false, error: partnerUpsertError.message || "Failed to save partner records" };
        }
      }

      // THEN update company_settings business_ownership_type to 'partnership'
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
      // Single Owner mode: Update company_settings FIRST. Preserve existing partner records without hard deletion
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
    }

    return { success: true };
  } catch (err: any) {
    console.error("Critical error in saveCompanyOwnershipStructure:", err);
    return { success: false, error: err.message || "Failed to save company ownership structure" };
  }
}
