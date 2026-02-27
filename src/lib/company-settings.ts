import { supabase } from "./supabase";

export interface CompanySettings {
    id?: string;
    organization_id: string;
    company_name: string;
    logo_url: string;
    phone: string;
    email: string;
    address: string;
    license_number: string;
    insurance_info: string;
    default_tax_rate: number;
    default_footer: string;
    default_terms: string;
    created_at?: string;
    updated_at?: string;
}

export const getCompanySettings = async (organizationId: string): Promise<CompanySettings | null> => {
    try {
        const { data, error } = await supabase
            .from("company_settings")
            .select("*")
            .eq("organization_id", organizationId)
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error fetching company settings:", error);
        return null;
    }
};

export const saveCompanySettings = async (settings: Partial<CompanySettings>): Promise<CompanySettings | null> => {
    try {
        const { data, error } = await supabase
            .from("company_settings")
            .upsert({
                ...settings,
                updated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error saving company settings:", error);
        throw error;
    }
};
