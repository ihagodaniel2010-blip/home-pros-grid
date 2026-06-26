import { useEffect, useState } from "react";
import { 
  getExpenses, 
  Expense, 
  createExpense, 
  updateExpense, 
  ExpenseCategory, 
  PaymentMethod, 
  PaymentSource, 
  ReimbursementStatus, 
  ClientReimbursementStatus,
  getReceiptFileUrl,
  uploadReceiptFile
} from "@/lib/expenses";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { Download, Plus, Receipt, Search, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { getServiceJobs } from "@/lib/service-jobs";

export default function Expenses() {
  const { user } = useUser();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentSourceFilter, setPaymentSourceFilter] = useState<string>("all");
  const [clientReimbFilter, setClientReimbFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // New Expense Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Expense>>({
    amount: 0,
    vendor: "",
    receipt_date: new Date().toISOString().split('T')[0],
    expense_category: "company_expense",
    payment_method: "card",
    payment_source: "company_card",
    reimbursable_to_owner: false,
    bill_to_client: false,
    reimbursement_status: "not_reimbursable",
    client_reimbursement_status: "not_billable",
    tax_year: new Date().getFullYear(),
    tax_category: "",
    paid_by_name: "",
    status: "active"
  });
  const [selectedFile, setSelectedFile] = useState<File | undefined>();

  useEffect(() => {
    fetchData();
  }, [user]);

  async function fetchData() {
    if (!user?.organization?.id) return;
    setIsLoading(true);
    try {
      const [fetchedExpenses, fetchedJobs] = await Promise.all([
        getExpenses(user.organization.id),
        getServiceJobs(user.organization.id)
      ]);
      setExpenses(fetchedExpenses);
      setJobs(fetchedJobs);
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle auto-suggestions for toggles
  useEffect(() => {
    if (isDialogOpen) {
      if (formData.payment_source === "owner_personal" || formData.payment_source === "partner_personal") {
        setFormData(prev => ({
          ...prev,
          reimbursable_to_owner: true,
          reimbursement_status: prev.reimbursement_status === "not_reimbursable" ? "pending_reimbursement" : prev.reimbursement_status
        }));
      }
    }
  }, [formData.payment_source, isDialogOpen]);

  useEffect(() => {
    if (isDialogOpen) {
      if (formData.expense_category === "client_reimbursable") {
        setFormData(prev => ({
          ...prev,
          bill_to_client: true,
          client_reimbursement_status: prev.client_reimbursement_status === "not_billable" ? "pending" : prev.client_reimbursement_status
        }));
      }
    }
  }, [formData.expense_category, isDialogOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organization?.id) return;
    
    setIsSubmitting(true);
    try {
      const res = await createExpense({
        ...formData,
        organization_id: user.organization.id,
        paid_by_user_id: user.id
      }, selectedFile);
      
      if (res.uploadError) {
        toast.warning(`Expense created, but file upload failed: ${res.uploadError}`);
      } else {
        toast.success("Expense created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Failed to create expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      amount: 0,
      vendor: "",
      receipt_date: new Date().toISOString().split('T')[0],
      expense_category: "company_expense",
      payment_method: "card",
      payment_source: "company_card",
      reimbursable_to_owner: false,
      bill_to_client: false,
      reimbursement_status: "not_reimbursable",
      client_reimbursement_status: "not_billable",
      tax_year: new Date().getFullYear(),
      tax_category: "",
      paid_by_name: "",
      status: "active"
    });
    setSelectedFile(undefined);
  };

  const downloadReceipt = async (path: string) => {
    try {
      const url = await getReceiptFileUrl(path);
      window.open(url, "_blank");
    } catch (error) {
      toast.error("Failed to open receipt file");
    }
  };

  const attachReceipt = async (receiptId: string, file: File) => {
    if (!user?.organization?.id) return;
    try {
      await uploadReceiptFile(user.organization.id, receiptId, file);
      toast.success("Receipt attached successfully");
      fetchData();
    } catch (err: any) {
      toast.error(`Failed to attach receipt: ${err.message}`);
    }
  };

  const updateStatus = async (id: string, updates: Partial<Expense>) => {
    try {
      await updateExpense(id, updates);
      toast.success("Expense updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update expense");
    }
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.vendor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || e.expense_category === categoryFilter;
    const matchesStatus = statusFilter === "all" || e.reimbursement_status === statusFilter;
    const matchesSource = paymentSourceFilter === "all" || e.payment_source === paymentSourceFilter;
    const matchesClientReimb = clientReimbFilter === "all" || e.client_reimbursement_status === clientReimbFilter;
    
    let matchesDate = true;
    if (dateFrom && new Date(e.receipt_date) < new Date(dateFrom)) matchesDate = false;
    if (dateTo && new Date(e.receipt_date) > new Date(dateTo)) matchesDate = false;

    return matchesSearch && matchesCategory && matchesStatus && matchesSource && matchesClientReimb && matchesDate;
  });

  // Calculate stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const stats = expenses.reduce((acc, exp) => {
    if (exp.status === "voided" || exp.status === "deleted") return acc;

    const expDate = new Date(exp.receipt_date);
    if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
      acc.monthlyTotal += Number(exp.amount);
    }
    if (exp.reimbursable_to_owner && exp.reimbursement_status !== 'reimbursed') {
      acc.pendingReimbursement += Number(exp.amount);
    }
    if (exp.bill_to_client && exp.client_reimbursement_status !== 'paid') {
      acc.billToClient += Number(exp.amount);
    }
    if (exp.payment_source.includes('personal') || exp.payment_source === 'other') {
      acc.paidPersonally += Number(exp.amount);
    }
    if (exp.expense_category === 'company_expense') {
      acc.companyExpenses += Number(exp.amount);
    }
    if (exp.expense_category === 'job_material') {
      acc.jobMaterials += Number(exp.amount);
    }
    return acc;
  }, {
    monthlyTotal: 0,
    paidPersonally: 0,
    billToClient: 0,
    pendingReimbursement: 0,
    companyExpenses: 0,
    jobMaterials: 0
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receipts & Expenses</h1>
          <p className="text-muted-foreground mt-1">Manage your company expenses, job materials, and reimbursements.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Input 
                    required 
                    value={formData.vendor} 
                    onChange={e => setFormData({...formData, vendor: e.target.value})} 
                    placeholder="e.g. Home Depot"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input 
                    required 
                    type="number" 
                    step="0.01" 
                    value={formData.amount} 
                    onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input 
                    required 
                    type="date" 
                    value={formData.receipt_date} 
                    onChange={e => setFormData({...formData, receipt_date: e.target.value})} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.expense_category} onValueChange={(val: ExpenseCategory) => setFormData({...formData, expense_category: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company_expense">Company Expense</SelectItem>
                      <SelectItem value="job_material">Job Material</SelectItem>
                      <SelectItem value="client_reimbursable">Client Reimbursable</SelectItem>
                      <SelectItem value="owner_reimbursable">Owner Reimbursable</SelectItem>
                      <SelectItem value="personal_not_business">Personal (Not Business)</SelectItem>
                      <SelectItem value="needs_review">Needs Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Payment Source</Label>
                  <Select value={formData.payment_source} onValueChange={(val: PaymentSource) => setFormData({...formData, payment_source: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company_account">Company Account</SelectItem>
                      <SelectItem value="company_card">Company Card</SelectItem>
                      <SelectItem value="owner_personal">Owner Personal</SelectItem>
                      <SelectItem value="partner_personal">Partner Personal</SelectItem>
                      <SelectItem value="employee_personal">Employee Personal</SelectItem>
                      <SelectItem value="customer_paid_direct">Customer Paid Direct</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={formData.payment_method} onValueChange={(val: PaymentMethod) => setFormData({...formData, payment_method: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="zelle">Zelle</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Paid By Name (Optional)</Label>
                  <Input 
                    value={formData.paid_by_name || ""} 
                    onChange={e => setFormData({...formData, paid_by_name: e.target.value})} 
                    placeholder="E.g., John Doe"
                  />
                </div>

                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label>Tax Category (Optional)</Label>
                  <Input 
                    value={formData.tax_category || ""} 
                    onChange={e => setFormData({...formData, tax_category: e.target.value})} 
                    placeholder="E.g., Supplies"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Assign to Job (Optional)</Label>
                  <Select value={formData.service_job_id || "none"} onValueChange={(val) => setFormData({...formData, service_job_id: val === "none" ? null : val})}>
                    <SelectTrigger><SelectValue placeholder="Select a job" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Job (Company Expense)</SelectItem>
                      {jobs.map(job => (
                        <SelectItem key={job.id} value={job.id}>
                          {job.title || `Job #${job.id.slice(0,8)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 flex gap-8 py-2">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={formData.reimbursable_to_owner} 
                      onCheckedChange={(checked) => setFormData({...formData, reimbursable_to_owner: checked})}
                      id="reimbursable-mode"
                    />
                    <Label htmlFor="reimbursable-mode" className="cursor-pointer font-medium">Reimbursable to owner</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={formData.bill_to_client} 
                      onCheckedChange={(checked) => setFormData({...formData, bill_to_client: checked})}
                      id="billable-mode"
                    />
                    <Label htmlFor="billable-mode" className="cursor-pointer font-medium">Bill to client</Label>
                  </div>
                </div>

                {formData.reimbursable_to_owner && (
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Reimbursement Status</Label>
                    <Select value={formData.reimbursement_status} onValueChange={(val: ReimbursementStatus) => setFormData({...formData, reimbursement_status: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_reimbursable">Not Reimbursable</SelectItem>
                        <SelectItem value="pending_reimbursement">Pending Reimbursement</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="reimbursed">Reimbursed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formData.bill_to_client && (
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Client Reimbursement</Label>
                    <Select value={formData.client_reimbursement_status} onValueChange={(val: ClientReimbursementStatus) => setFormData({...formData, client_reimbursement_status: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_billable">Not Billable</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="invoiced">Invoiced</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="space-y-2 col-span-2">
                  <Label>Receipt File (Optional)</Label>
                  <Input 
                    type="file" 
                    onChange={e => setSelectedFile(e.target.files?.[0])} 
                    accept="image/*,.pdf"
                  />
                  <p className="text-xs text-muted-foreground">Upload picture or PDF of the receipt. If this fails, you can attach it later.</p>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Notes</Label>
                  <Input 
                    value={formData.notes || ""} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                    placeholder="Optional notes"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total this Month</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-xl font-bold">${stats.monthlyTotal.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Paid Personally</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-xl font-bold">${stats.paidPersonally.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Pending Reimb.</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-xl font-bold">${stats.pendingReimbursement.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Bill to Client</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-xl font-bold">${stats.billToClient.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Company Exp.</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-xl font-bold">${stats.companyExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Job Materials</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-xl font-bold">${stats.jobMaterials.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <CardTitle>Transactions</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="company_expense">Company Expense</SelectItem>
                  <SelectItem value="job_material">Job Material</SelectItem>
                  <SelectItem value="client_reimbursable">Client Reimbursable</SelectItem>
                  <SelectItem value="owner_reimbursable">Owner Reimbursable</SelectItem>
                  <SelectItem value="personal_not_business">Personal (Not Business)</SelectItem>
                  <SelectItem value="needs_review">Needs Review</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentSourceFilter} onValueChange={setPaymentSourceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="company_account">Company Account</SelectItem>
                  <SelectItem value="company_card">Company Card</SelectItem>
                  <SelectItem value="owner_personal">Owner Personal</SelectItem>
                  <SelectItem value="employee_personal">Employee Personal</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Reimbursement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reimb. Status</SelectItem>
                  <SelectItem value="not_reimbursable">Not Reimbursable</SelectItem>
                  <SelectItem value="pending_reimbursement">Pending Reimb.</SelectItem>
                  <SelectItem value="reimbursed">Reimbursed</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[140px]" />
                <span className="text-muted-foreground text-sm">to</span>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[140px]" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No expenses found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className={expense.status === "voided" ? "opacity-50" : ""}>
                    <TableCell>{format(new Date(expense.receipt_date), "MMM d, yyyy")}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {expense.vendor}
                        {expense.receipt_files && expense.receipt_files.length > 0 && (
                          <FileText className="w-3 h-3 text-blue-500" />
                        )}
                      </div>
                      {expense.service_job_id && (
                        <div className="text-xs text-muted-foreground">Job #{expense.service_job_id.slice(0,8)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {expense.expense_category.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {expense.payment_source.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">
                      ${Number(expense.amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant={
                          expense.status === "voided" ? "destructive" : 
                          expense.reimbursement_status === "reimbursed" ? "default" : 
                          "outline"
                        }>
                          {expense.status === "voided" ? "Voided" : expense.reimbursement_status.replace(/_/g, " ")}
                        </Badge>
                        {expense.bill_to_client && (
                          <Badge variant="outline" className="text-[10px]">
                            Client: {expense.client_reimbursement_status}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {expense.receipt_files && expense.receipt_files.length > 0 ? (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            title="Download Receipt"
                            onClick={() => downloadReceipt(expense.receipt_files![0].storage_path)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" title="Attach Receipt">
                                <Upload className="w-4 h-4 text-blue-500" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Attach Receipt to {expense.vendor}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <Input type="file" id={`file-${expense.id}`} accept="image/*,.pdf" />
                                <Button onClick={() => {
                                  const fileInput = document.getElementById(`file-${expense.id}`) as HTMLInputElement;
                                  if (fileInput?.files?.[0]) {
                                    attachReceipt(expense.id, fileInput.files[0]);
                                  } else {
                                    toast.error("Please select a file first");
                                  }
                                }}>Upload</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                        {expense.status === "active" && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-600"
                            title="Void Expense"
                            onClick={() => {
                              if(confirm("Void this expense?")) {
                                updateStatus(expense.id, { status: "voided" });
                              }
                            }}
                          >
                            Void
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
