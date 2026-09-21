import { supabase } from "./supabase";

export type ExpenseCategory = 
  | "company_expense"
  | "job_material"
  | "client_reimbursable"
  | "owner_reimbursable"
  | "partner_reimbursable"
  | "personal_not_business"
  | "needs_review";

export type PaymentMethod = 
  | "card"
  | "cash"
  | "zelle"
  | "venmo"
  | "check"
  | "bank_transfer"
  | "other";

export type PaymentSource = 
  | "company_account"
  | "company_card"
  | "owner_personal"
  | "partner_personal"
  | "employee_personal"
  | "customer_paid_direct"
  | "other";

export type ClientReimbursementStatus = "not_billable" | "pending" | "invoiced" | "paid";
export type ReimbursementStatus = 
  | "not_reimbursable"
  | "pending"
  | "pending_reimbursement"
  | "approved"
  | "paid"
  | "reimbursed"
  | "rejected";

export type ExpenseStatus = "active" | "voided" | "deleted";

export interface Expense {
  id: string;
  organization_id: string;
  service_job_id?: string | null;
  estimate_id?: string | null;
  related_lead_id?: string | null;
  amount: number;
  vendor: string;
  receipt_date: string;
  expense_category: ExpenseCategory;
  payment_method: PaymentMethod;
  payment_source: PaymentSource;
  paid_by_user_id?: string | null;
  paid_by_name?: string | null;
  reimbursable_to_owner: boolean;
  bill_to_client: boolean;
  reimbursement_status: ReimbursementStatus;
  client_reimbursement_status: ClientReimbursementStatus;
  tax_year?: number | null;
  tax_category?: string | null;
  notes?: string | null;
  status: ExpenseStatus;
  created_at: string;
  updated_at: string;
  receipt_files?: ReceiptFile[];
}

export interface ReceiptFile {
  id: string;
  organization_id: string;
  receipt_id: string;
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export async function getExpenses(organizationId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("receipts")
    .select(`
      *,
      receipt_files (*)
    `)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("receipt_date", { ascending: false });

  if (error) {
    console.error("Error fetching expenses:", error);
    throw error;
  }

  return data as Expense[];
}

export async function uploadReceiptFile(
  organizationId: string,
  receiptId: string,
  file: File,
  userId?: string
) {
  const fileExt = file.name.split(".").pop() || "jpg";
  const relativePath = `${organizationId}/receipts/${receiptId}-${Date.now()}.${fileExt}`;
  
  let finalStoragePath = "";
  let finalBucket = "images";

  // Multi-bucket fallback strategy for storage resilience
  const { error: err1 } = await supabase.storage.from("images").upload(relativePath, file, { upsert: true });
  if (!err1) {
    finalStoragePath = `images/${relativePath}`;
    finalBucket = "images";
  } else {
    const { error: err2 } = await supabase.storage.from("documents").upload(relativePath, file, { upsert: true });
    if (!err2) {
      finalStoragePath = `documents/${relativePath}`;
      finalBucket = "documents";
    } else {
      const { error: err3 } = await supabase.storage.from("receipts").upload(relativePath, file, { upsert: true });
      if (!err3) {
        finalStoragePath = `receipts/${relativePath}`;
        finalBucket = "receipts";
      }
    }
  }

  if (finalStoragePath) {
    try {
      await supabase
        .from("receipt_files")
        .insert([
          {
            organization_id: organizationId,
            receipt_id: receiptId,
            storage_bucket: finalBucket,
            storage_path: finalStoragePath,
            file_name: file.name,
            mime_type: file.type || "image/jpeg",
            file_size: file.size,
            uploaded_by: userId || null,
          },
        ]);

      // Update receipts table directly with storage path for instant access
      await supabase
        .from("receipts")
        .update({ receipt_storage_path: finalStoragePath })
        .eq("id", receiptId);
    } catch (recordErr) {
      console.warn("receipt_files/receipts update record handled:", recordErr);
    }
  }
}

export async function createExpense(
  expenseData: Partial<Expense>,
  file?: File
): Promise<{ receipt: Expense; uploadError?: string }> {
  // Sanitize reimbursement_status to comply strictly with PostgreSQL check constraint
  let validReimbursementStatus: string = (expenseData.reimbursement_status as string) || 'not_reimbursable';
  if (validReimbursementStatus === 'pending') {
    validReimbursementStatus = 'pending_reimbursement';
  } else if (validReimbursementStatus === 'settled') {
    validReimbursementStatus = 'reimbursed';
  } else if (!['not_reimbursable', 'reimbursable', 'pending_reimbursement', 'reimbursed'].includes(validReimbursementStatus)) {
    validReimbursementStatus = 'not_reimbursable';
  }

  // Sanitize client_reimbursement_status
  let validClientStatus: string = (expenseData.client_reimbursement_status as string) || (expenseData.bill_to_client ? 'pending' : 'not_billable');
  if (!['not_billable', 'pending', 'invoiced', 'paid'].includes(validClientStatus)) {
    validClientStatus = expenseData.bill_to_client ? 'pending' : 'not_billable';
  }

  // Sanitize expense_category
  let validCategory: string = (expenseData.expense_category as string) || 'company_expense';
  if (validCategory === 'partner_reimbursement') {
    validCategory = 'partner_reimbursable';
  } else if (!['company_expense', 'job_material', 'client_reimbursable', 'owner_reimbursable', 'partner_reimbursable', 'personal_not_business', 'needs_review'].includes(validCategory)) {
    validCategory = 'job_material';
  }

  const payload = {
    ...expenseData,
    expense_category: validCategory as ExpenseCategory,
    reimbursement_status: validReimbursementStatus as ReimbursementStatus,
    client_reimbursement_status: validClientStatus as ClientReimbursementStatus
  };

  // Insert receipt into public.receipts
  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .insert([payload])
    .select()
    .single();

  if (receiptError) {
    console.error("Error creating expense/receipt:", receiptError);
    throw receiptError;
  }

  let uploadErrorMsg: string | undefined;

  // Handle file upload if present
  if (file && receipt) {
    try {
      await uploadReceiptFile(receipt.organization_id, receipt.id, file);
    } catch (err: any) {
      console.error("Error during file upload, but receipt was created:", err);
      uploadErrorMsg = err.message || "Failed to upload receipt file.";
    }
  }

  return { receipt: receipt as Expense, uploadError: uploadErrorMsg };
}

export async function updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
  const { data, error } = await supabase
    .from("receipts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating expense:", error);
    throw error;
  }

  return data as Expense;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from("receipts")
    .update({ status: "deleted" })
    .eq("id", id);

  if (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
}

export async function getReceiptFileUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(storagePath, 60); // 60 seconds

  if (error) {
    console.error("Error creating signed URL:", error);
    throw error;
  }

  return data.signedUrl;
}
