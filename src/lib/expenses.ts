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
  file: File
) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const fileExt = file.name.split(".").pop();
  const fileName = `${receiptId}-${Date.now()}.${fileExt}`;
  const filePath = `${organizationId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Error uploading receipt file:", uploadError);
    throw uploadError;
  }

  // Create receipt_files record
  const { error: fileRecordError } = await supabase
    .from("receipt_files")
    .insert([
      {
        organization_id: organizationId,
        receipt_id: receiptId,
        storage_bucket: "receipts",
        storage_path: filePath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        uploaded_by: userId,
      },
    ]);

  if (fileRecordError) {
    console.error("Error recording receipt file:", fileRecordError);
    throw fileRecordError;
  }
}

export async function createExpense(
  expenseData: Partial<Expense>,
  file?: File
): Promise<{ receipt: Expense; uploadError?: string }> {
  // Insert receipt
  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .insert([{ ...expenseData }])
    .select()
    .single();

  if (receiptError) {
    console.error("Error creating expense:", receiptError);
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
