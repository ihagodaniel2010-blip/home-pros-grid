import { useEffect, useState } from "react";
import { getExpenses, Expense, updateExpense, ExpenseCategory, PaymentSource, ReimbursementStatus, ClientReimbursementStatus } from "@/lib/expenses";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Search, ExternalLink, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getServiceJobs } from "@/lib/service-jobs";

export default function Reimbursements() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paidByFilter, setPaidByFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [reimbStatusFilter, setReimbStatusFilter] = useState("all");
  const [clientStatusFilter, setClientStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");

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
      toast.error("Failed to load reimbursements data");
    } finally {
      setIsLoading(false);
    }
  }

  const handleUpdate = async (id: string, updates: Partial<Expense>) => {
    try {
      await updateExpense(id, updates);
      toast.success("Status updated");
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const getPaidByName = (exp: Expense) => {
    if (exp.paid_by_name) return exp.paid_by_name;
    if (exp.paid_by_user_id === user?.id) return "Me (Logged In)";
    if (exp.paid_by_user_id) return "Partner"; // fallback if we don't have full partners list in MVP
    return "Unknown";
  };

  // 1. Company owes owner:
  const companyOwesOwner = expenses.filter(e => 
    e.reimbursable_to_owner && 
    ['owner_personal', 'partner_personal', 'employee_personal'].includes(e.payment_source) &&
    ['pending', 'pending_reimbursement', 'approved'].includes(e.reimbursement_status)
  ).reduce((acc, e) => acc + Number(e.amount), 0);

  // 2. Already reimbursed:
  const alreadyReimbursed = expenses.filter(e => 
    ['paid', 'reimbursed'].includes(e.reimbursement_status)
  ).reduce((acc, e) => acc + Number(e.amount), 0);

  // 3. Client owes company:
  const clientOwesCompany = expenses.filter(e => 
    e.bill_to_client && 
    ['pending', 'invoiced'].includes(e.client_reimbursement_status)
  ).reduce((acc, e) => acc + Number(e.amount), 0);

  // 4. Client paid:
  const clientPaid = expenses.filter(e => 
    e.bill_to_client && 
    e.client_reimbursement_status === 'paid'
  ).reduce((acc, e) => acc + Number(e.amount), 0);

  // 5. Personal not business:
  const personalNotBusiness = expenses.filter(e => 
    e.expense_category === 'personal_not_business'
  ).reduce((acc, e) => acc + Number(e.amount), 0);

  // 6. Needs review:
  const needsReview = expenses.filter(e => 
    e.expense_category === 'needs_review' || 
    e.reimbursement_status === 'pending'
  ).reduce((acc, e) => acc + Number(e.amount), 0);


  const filteredExpenses = expenses.filter(e => {
    if (e.status === "voided" || e.status === "deleted") return false;

    let matches = true;
    if (searchTerm && !e.vendor.toLowerCase().includes(searchTerm.toLowerCase())) matches = false;
    if (dateFrom && new Date(e.receipt_date) < new Date(dateFrom)) matches = false;
    if (dateTo && new Date(e.receipt_date) > new Date(dateTo)) matches = false;
    if (paidByFilter && !getPaidByName(e).toLowerCase().includes(paidByFilter.toLowerCase())) matches = false;
    if (sourceFilter !== "all" && e.payment_source !== sourceFilter) matches = false;
    if (reimbStatusFilter !== "all" && e.reimbursement_status !== reimbStatusFilter) matches = false;
    if (clientStatusFilter !== "all" && e.client_reimbursement_status !== clientStatusFilter) matches = false;
    if (categoryFilter !== "all" && e.expense_category !== categoryFilter) matches = false;
    if (jobFilter !== "all" && e.service_job_id !== jobFilter) matches = false;
    
    // Default filter for Reimbursements view: Only show relevant items (reimbursable, billable, or needs review/personal)
    if (matches && !searchTerm && categoryFilter === "all" && sourceFilter === "all") {
      const isRelevant = e.reimbursable_to_owner || e.bill_to_client || e.expense_category === 'personal_not_business' || e.expense_category === 'needs_review' || e.reimbursement_status !== 'not_reimbursable';
      if (!isRelevant) matches = false;
    }

    return matches;
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reimbursements & Accounts</h1>
          <p className="text-muted-foreground mt-1">Settle accounts between company, owners, and clients.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Company owes owners</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-xl font-bold text-red-500">${companyOwesOwner.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Client owes company</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-xl font-bold text-orange-500">${clientOwesCompany.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Already Reimbursed</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-xl font-bold text-green-500">${alreadyReimbursed.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Client Paid</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-xl font-bold text-blue-500">${clientPaid.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Personal Not Business</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-xl font-bold">${personalNotBusiness.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">Needs Review</CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            <div className="text-xl font-bold text-yellow-500">${needsReview.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative w-full sm:w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <Input
                placeholder="Paid by name..."
                className="w-full sm:w-40"
                value={paidByFilter}
                onChange={e => setPaidByFilter(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[140px]" />
                <span className="text-muted-foreground text-sm">to</span>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[140px]" />
              </div>
              
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="client_reimbursable">Client Reimbursable</SelectItem>
                  <SelectItem value="owner_reimbursable">Owner Reimbursable</SelectItem>
                  <SelectItem value="personal_not_business">Personal (Not Business)</SelectItem>
                  <SelectItem value="needs_review">Needs Review</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="owner_personal">Owner Personal</SelectItem>
                  <SelectItem value="partner_personal">Partner Personal</SelectItem>
                  <SelectItem value="employee_personal">Employee Personal</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={reimbStatusFilter} onValueChange={setReimbStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Internal Reimb." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Internal Status</SelectItem>
                  <SelectItem value="pending_reimbursement">Pending Reimb.</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="reimbursed">Reimbursed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={clientStatusFilter} onValueChange={setClientStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Client Reimb." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Client Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Select a job" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Jobs</SelectItem>
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title || `Job #${job.id.slice(0,8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Vendor</TableHead>
                <TableHead>Paid By</TableHead>
                <TableHead>Category / Source</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Internal Reimb.</TableHead>
                <TableHead>Client Reimb.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No records found matching filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <div className="font-medium">{expense.vendor}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(expense.receipt_date), "MMM d, yyyy")}</div>
                      {expense.service_job_id && (
                        <div className="text-xs text-muted-foreground">Job #{expense.service_job_id.slice(0,8)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{getPaidByName(expense)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="outline" className="capitalize text-[10px]">
                          {expense.expense_category.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="secondary" className="capitalize text-[10px]">
                          {expense.payment_source.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      ${Number(expense.amount).toFixed(2)}
                    </TableCell>
                    
                    <TableCell>
                      {expense.reimbursable_to_owner ? (
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={
                            expense.reimbursement_status === "reimbursed" ? "default" : 
                            expense.reimbursement_status === "approved" ? "secondary" : "outline"
                          }>
                            {expense.reimbursement_status.replace(/_/g, " ")}
                          </Badge>
                          
                          {/* Internal Reimb Actions */}
                          {expense.reimbursement_status === "pending_reimbursement" && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-blue-500 p-0 px-1" onClick={() => handleUpdate(expense.id, { reimbursement_status: 'approved' })}>
                              <CheckCircle className="w-3 h-3 mr-1"/> Approve
                            </Button>
                          )}
                          {(expense.reimbursement_status === "approved" || expense.reimbursement_status === "pending_reimbursement") && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-green-500 p-0 px-1" onClick={() => handleUpdate(expense.id, { reimbursement_status: 'reimbursed' })}>
                              Mark Reimbursed
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {expense.bill_to_client ? (
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={
                            expense.client_reimbursement_status === "paid" ? "default" : 
                            expense.client_reimbursement_status === "invoiced" ? "secondary" : "outline"
                          }>
                            {expense.client_reimbursement_status.replace(/_/g, " ")}
                          </Badge>
                          
                          {/* Client Reimb Actions */}
                          {expense.client_reimbursement_status === "pending" && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-blue-500 p-0 px-1" onClick={() => handleUpdate(expense.id, { client_reimbursement_status: 'invoiced' })}>
                              Mark Invoiced
                            </Button>
                          )}
                          {expense.client_reimbursement_status === "invoiced" && (
                            <Button size="sm" variant="ghost" className="h-6 text-xs text-green-500 p-0 px-1" onClick={() => handleUpdate(expense.id, { client_reimbursement_status: 'paid' })}>
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="Open Expense"
                        onClick={() => {
                          // Filter Expenses page by vendor name to highlight it
                          navigate(`/admin/expenses`);
                        }}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
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
