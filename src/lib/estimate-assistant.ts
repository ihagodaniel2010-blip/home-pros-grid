import { supabase } from "./supabase";

export interface EstimateAssistantInput {
  serviceType: string;
  jobDescription: string;
  measurements: {
    length?: number;
    width?: number;
    height?: number;
    squareFeet?: number;
    linearFeet?: number;
    quantity?: number;
    rooms?: number;
    windows?: number;
    doors?: number;
  };
  labor: {
    hourlyRate: number;
    estimatedHours: number;
    crewSize: number;
    difficulty: "easy" | "medium" | "hard";
  };
  materials: {
    name: string;
    quantity: number;
    unitCost: number;
    markupPercent: number;
  }[];
  pricing: {
    overheadPercent: number;
    profitMarginPercent: number;
    discount: number;
  };
}

export interface EstimateAssistantOutput {
  title: string;
  scopeOfWork: string;
  laborItems: { description: string; quantity: number; unitPrice: number; totalPrice: number }[];
  materialItems: { description: string; quantity: number; unitPrice: number; totalPrice: number }[];
  exclusions: string;
  customerFriendlyText: string;
  totals: {
    laborTotal: number;
    materialsTotal: number;
    subtotal: number;
    overheadAmount: number;
    profitAmount: number;
    discountAmount: number;
    finalTotal: number;
  };
}

export interface EstimateAssistantDraft {
  id?: string;
  organization_id: string;
  lead_id?: string;
  estimate_id?: string;
  created_by?: string;
  service_type: string;
  input: EstimateAssistantInput;
  output: EstimateAssistantOutput;
  status: "draft" | "converted" | "deleted";
  created_at?: string;
  updated_at?: string;
}

export function generateEstimateDraft(input: EstimateAssistantInput): EstimateAssistantOutput {
  // 1. Calculate Labor
  const difficultyMultiplier = input.labor.difficulty === "hard" ? 1.2 : input.labor.difficulty === "medium" ? 1.1 : 1.0;
  const totalLaborHours = input.labor.estimatedHours * input.labor.crewSize * difficultyMultiplier;
  const laborTotal = Number((totalLaborHours * input.labor.hourlyRate).toFixed(2));

  const laborItems = [
    {
      description: `${input.serviceType.charAt(0).toUpperCase() + input.serviceType.slice(1)} Labor (${input.labor.crewSize} crew, ${input.labor.estimatedHours} hrs, ${input.labor.difficulty} difficulty)`,
      quantity: Number(totalLaborHours.toFixed(2)),
      unitPrice: input.labor.hourlyRate,
      totalPrice: laborTotal
    }
  ];

  // 2. Calculate Materials
  let materialsTotal = 0;
  let materialsCost = 0; // Pure cost without markup, for reporting if needed
  const materialItems = input.materials.map(m => {
    const cost = m.quantity * m.unitCost;
    const markupAmount = cost * (m.markupPercent / 100);
    const finalPrice = cost + markupAmount;
    
    materialsCost += cost;
    materialsTotal += finalPrice;

    return {
      description: m.name,
      quantity: m.quantity,
      unitPrice: Number(((m.unitCost * (1 + (m.markupPercent/100)))).toFixed(2)),
      totalPrice: Number(finalPrice.toFixed(2))
    };
  });
  
  materialsTotal = Number(materialsTotal.toFixed(2));

  // 3. Subtotal
  const subtotal = Number((laborTotal + materialsTotal).toFixed(2));

  // 4. Overhead & Profit
  const overheadAmount = Number((subtotal * (input.pricing.overheadPercent / 100)).toFixed(2));
  const profitAmount = Number((subtotal * (input.pricing.profitMarginPercent / 100)).toFixed(2));
  const discountAmount = input.pricing.discount || 0;

  const finalTotal = Number((subtotal + overheadAmount + profitAmount - discountAmount).toFixed(2));

  // 5. Generate Text Strings
  const title = `${input.serviceType.toUpperCase()} Service Proposal`;
  const scopeOfWork = `Job Description:\n${input.jobDescription || 'Standard service as requested.'}\n\nMeasurements Overview:\n${Object.entries(input.measurements).filter(([_,v])=>v).map(([k,v]) => `${k}: ${v}`).join(', ')}`;
  const exclusions = "Any hidden damages found during execution.\nPermit fees unless specified.\nMaterials not listed above.";
  
  const customerFriendlyText = `Thank you for considering us for your ${input.serviceType} project.\n\nWe propose to furnish all materials and perform all labor necessary for the completion of:\n${input.jobDescription || 'The requested service.'}\n\nTotal Investment: $${finalTotal.toLocaleString()}`;

  return {
    title,
    scopeOfWork,
    laborItems,
    materialItems,
    exclusions,
    customerFriendlyText,
    totals: {
      laborTotal,
      materialsTotal,
      subtotal,
      overheadAmount,
      profitAmount,
      discountAmount,
      finalTotal
    }
  };
}

export const saveAssistantDraft = async (draft: EstimateAssistantDraft): Promise<EstimateAssistantDraft | null> => {
  if (!supabase) return null;

  try {
    // We get the user id directly inside this file or assume the caller passes it, but let's grab it via auth.getUser
    let userId = draft.created_by;
    if (!userId) {
       const { data: { user } } = await supabase.auth.getUser();
       if (user) userId = user.id;
    }

    if (!userId) throw new Error("User ID is required to save a draft.");

    const payload = {
        ...draft,
        created_by: userId
    };

    if (draft.id) {
        const { data, error } = await supabase
            .from('estimate_assistant_drafts')
            .update(payload)
            .eq('id', draft.id)
            .select()
            .single();
        if (error) throw error;
        return data as EstimateAssistantDraft;
    } else {
        const { data, error } = await supabase
            .from('estimate_assistant_drafts')
            .insert([payload])
            .select()
            .single();
        if (error) throw error;
        return data as EstimateAssistantDraft;
    }
  } catch (error) {
    console.error("Error saving draft:", error);
    return null;
  }
};

export const getAssistantDraftById = async (id: string): Promise<EstimateAssistantDraft | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('estimate_assistant_drafts')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        console.error("Error fetching draft:", error);
        return null;
    }
    return data as EstimateAssistantDraft;
};

// [TODO for Phase 6.X: Future Edge Function call to OpenAI for smart scope generation]
// export const generateSmartScopeAI = async (input: EstimateAssistantInput) => { ... }
