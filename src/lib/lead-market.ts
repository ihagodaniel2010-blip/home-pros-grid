import { supabase } from "./supabase";
import { type Lead } from "./leads";

export const getOrganizationBalance = async (): Promise<number> => {
    if (!supabase) return 0;
    
    // First try the RPC if it exists
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 0;

    const { data: memberData } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (!memberData?.organization_id) return 0;

    const { data, error } = await supabase.rpc('get_organization_credit_balance', {
        org_id: memberData.organization_id
    });

    if (error) {
        console.warn("Could not get balance via RPC, trying ledger fallback...", error);
        // Fallback: sum the ledger manually if RPC fails or isn't available
        const { data: ledgerData, error: ledgerError } = await supabase
            .from('organization_credit_ledger')
            .select('amount')
            .eq('organization_id', memberData.organization_id);
            
        if (ledgerError || !ledgerData) return 0;
        return ledgerData.reduce((sum, row) => sum + Number(row.amount), 0);
    }

    return data || 0;
};

export const getPublicAvailableLeads = async (): Promise<any[]> => {
    if (!supabase) return [];

    // Try to get public leads via the proposed RPC
    const { data, error } = await supabase.rpc('get_public_available_leads');

    if (error) {
        console.warn("Could not fetch public leads via RPC (maybe not applied yet):", error);
        return [];
    }

    return data || [];
};

export const buyLead = async (leadId: string): Promise<{success: boolean, message: string}> => {
    if (!supabase) return { success: false, message: 'Supabase not initialized' };

    // Try to call the proposed RPC `buy_public_lead`
    // Since it's pending approval (006), this might fail. We handle the error gracefully.
    const { data, error } = await supabase.rpc('buy_public_lead', {
        p_lead_id: leadId
    });

    if (error) {
        console.warn("buy_public_lead RPC error:", error);
        return { 
            success: false, 
            message: 'RPC de compra pendente de aprovação ou falhou: ' + error.message 
        };
    }

    if (data && !data.success) {
        return { success: false, message: data.message };
    }

    return { success: true, message: 'Lead purchased successfully!' };
};
