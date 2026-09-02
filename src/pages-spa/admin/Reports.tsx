import { useState, useEffect, useMemo, useRef } from "react";
import { getLeads, Lead } from "@/lib/leads";
import { getEstimates, Estimate } from "@/lib/estimates";
import { getClientPayments, ClientPayment } from "@/lib/client-payments";
import { getExpenses, Expense } from "@/lib/expenses";
import { getServiceJobs } from "@/lib/service-jobs";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Download, Printer, Copy, CheckCircle2, TrendingUp, TrendingDown, DollarSign, Briefcase, FileText, AlertTriangle } from "lucide-react";

export default function Reports() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [leads, setLeads] = useState<Lead[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);

  // Filters
  const [dateRange, setDateRange] = useState("this_year");

  useEffect(() => {
    async function loadData() {
      if (!user?.organization?.id) return;
      setIsLoading(true);
      try {
        const [lData, eData, pData, expData, jData] = await Promise.all([
          getLeads(),
          getEstimates(),
          getClientPayments(user.organization.id),
          getExpenses(user.organization.id),
          getServiceJobs(user.organization.id)
        ]);
        setLeads(lData);
        setEstimates(eData);
        setPayments(pData);
        setExpenses(expData);
        setJobs(jData);
      } catch (err) {
        console.error("Failed to load report data", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Date Filtering Logic
  const filterByDate = (dateString: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const now = new Date();
    
    if (dateRange === "this_month") {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    if (dateRange === "last_month") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
    }
    if (dateRange === "this_year") {
      return date.getFullYear() === now.getFullYear();
    }
    return true; // all_time
  };

  const filteredLeads = useMemo(() => leads.filter(l => filterByDate(l.createdAt)), [leads, dateRange]);
  const filteredEstimates = useMemo(() => estimates.filter(e => filterByDate(e.created_at)), [estimates, dateRange]);
  const filteredPayments = useMemo(() => payments.filter(p => filterByDate(p.payment_date)), [payments, dateRange]);
  const filteredExpenses = useMemo(() => expenses.filter(e => filterByDate(e.receipt_date)), [expenses, dateRange]);
  const filteredJobs = useMemo(() => jobs.filter(j => filterByDate(j.created_at)), [jobs, dateRange]);

  // Metrics
  const metrics = useMemo(() => {
    const grossRevenue = filteredPayments.filter(p => p.status === 'received').reduce((sum, p) => sum + p.amount, 0);
    
    const activeExpenses = filteredExpenses.filter(e => e.status === 'active');
    const totalExpenses = activeExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netBeforeReview = grossRevenue - totalExpenses;

    const newLeads = filteredLeads.length;
    const estimatesSent = filteredEstimates.length;
    const estimatesApproved = filteredEstimates.filter(e => e.status === 'Approved' || e.status === 'Paid').length;
    const approvalRate = estimatesSent > 0 ? Math.round((estimatesApproved / estimatesSent) * 100) : 0;

    const activeJobs = filteredJobs.filter(j => j.status === 'in_progress' || j.status === 'scheduled').length;
    
    const pendingReimbursements = activeExpenses.filter(e => 
      (e.reimbursable_to_owner || e.expense_category === 'owner_reimbursable') && 
      (e.reimbursement_status === 'pending' || e.reimbursement_status === 'pending_reimbursement')
    ).length;

    const taxNeedsReview = activeExpenses.filter(e => e.expense_category === 'needs_review' || !e.tax_category).length;
    const missingReceiptFiles = activeExpenses.filter(e => !e.receipt_files || e.receipt_files.length === 0).length;

    return {
      grossRevenue, totalExpenses, netBeforeReview, newLeads, estimatesSent, 
      estimatesApproved, approvalRate, activeJobs, pendingReimbursements, 
      taxNeedsReview, missingReceiptFiles
    };
  }, [filteredLeads, filteredEstimates, filteredPayments, filteredExpenses, filteredJobs]);

  const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const generateExecutiveSummary = () => {
    const period = dateRange.replace("_", " ");
    return `This period (${period}) generated ${formatCurrency(metrics.grossRevenue)} in client payments, ${formatCurrency(metrics.totalExpenses)} in expenses, and ${formatCurrency(metrics.netBeforeReview)} net before accountant review. The company received ${metrics.newLeads} leads, sent ${metrics.estimatesSent} estimates, and approved ${metrics.estimatesApproved} estimates. Active jobs currently sit at ${metrics.activeJobs}. Note: Net before accountant review is not tax advice.`;
  };

  const copyExecutiveSummary = () => {
    navigator.clipboard.writeText(generateExecutiveSummary());
    alert("Executive summary copied to clipboard!");
  };

  const exportCSV = (filename: string, rows: object[]) => {
    if (!rows || rows.length === 0) return;
    const headers = Object.keys(rows[0]).join(",");
    const csvContent = [
      headers,
      ...rows.map(row => 
        Object.values(row)
          .map(value => {
            const str = String(value ?? "");
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(",")
      )
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${dateRange}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (user?.organization?.role === 'worker') {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-red-500 font-bold">Access Denied: Workers cannot view Executive Reports.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8 text-gray-500">Loading company data...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0b2a4a] flex items-center gap-2">
            <PieChart className="h-8 w-8 text-blue-600" />
            Company Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Executive summary and financial health indicators.</p>
        </div>
        <div className="flex gap-3 bg-white p-2 rounded-lg shadow-sm border print:hidden">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40 border-none shadow-none font-bold text-[#0b2a4a]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => window.print()} title="Print Report">
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm print:shadow-none print:border-gray-300">
        <p className="text-sm text-blue-900 font-medium italic print:text-black">
          "{generateExecutiveSummary()}"
        </p>
        <Button variant="outline" size="sm" onClick={copyExecutiveSummary} className="shrink-0 bg-white print:hidden">
          <Copy className="h-4 w-4 mr-2" /> Copy Summary
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white border rounded-xl p-1 shadow-sm overflow-x-auto flex-nowrap w-full justify-start print:hidden">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="estimates">Estimates</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Financial Cards */}
            <Card className="bg-green-50/50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-green-800 font-semibold uppercase tracking-wider flex justify-between">
                  Gross Revenue <TrendingUp className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-900">{formatCurrency(metrics.grossRevenue)}</div>
              </CardContent>
            </Card>

            <Card className="bg-red-50/50 border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-red-800 font-semibold uppercase tracking-wider flex justify-between">
                  Total Expenses <TrendingDown className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-900">{formatCurrency(metrics.totalExpenses)}</div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50/50 border-blue-200 sm:col-span-2 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-blue-800 font-semibold uppercase tracking-wider flex justify-between">
                  Net Before Review <DollarSign className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-blue-900">{formatCurrency(metrics.netBeforeReview)}</div>
                <p className="text-xs text-blue-600 mt-1">Not tax advice. Subject to accountant review.</p>
              </CardContent>
            </Card>

            {/* Operational Cards */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-gray-500 font-semibold uppercase tracking-wider">New Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.newLeads}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Estimates Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.estimatesSent}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Approval Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[#0b2a4a]">{metrics.approvalRate}%</div>
                <p className="text-xs text-gray-400 mt-1">{metrics.estimatesApproved} approved</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Active Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.activeJobs}</div>
              </CardContent>
            </Card>

            {/* Attention Cards */}
            <Card className={`${metrics.pendingReimbursements > 0 ? 'bg-orange-50 border-orange-200' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-orange-800">Pending Reimb.</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-900">{metrics.pendingReimbursements}</div>
              </CardContent>
            </Card>

            <Card className={`${metrics.taxNeedsReview > 0 ? 'bg-red-50 border-red-200' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-red-800">Tax Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-900">{metrics.taxNeedsReview}</div>
              </CardContent>
            </Card>

            <Card className={`${metrics.missingReceiptFiles > 0 ? 'bg-yellow-50 border-yellow-200' : ''}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-yellow-800">Missing Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-900">{metrics.missingReceiptFiles}</div>
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="leads">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Leads Summary</CardTitle>
                <CardDescription>Breakdown by status and source.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => exportCSV('Leads_Report', filteredLeads)}><Download className="h-4 w-4 mr-2"/> Export</Button>
            </CardHeader>
            <CardContent>
               <div className="h-8 flex w-full rounded overflow-hidden mb-6 bg-gray-100">
                  {/* CSS Bar Chart Simulation */}
                  <div style={{width: '25%'}} className="bg-blue-400" title="New"></div>
                  <div style={{width: '40%'}} className="bg-blue-600" title="Contacted"></div>
                  <div style={{width: '20%'}} className="bg-green-500" title="Approved"></div>
                  <div style={{width: '15%'}} className="bg-gray-400" title="Closed"></div>
               </div>
               <p className="text-sm text-gray-500 text-center italic">Leads status distribution (Visual MVP)</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estimates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Estimates Summary</CardTitle>
                <CardDescription>Conversion metrics and volume.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => exportCSV('Estimates_Report', filteredEstimates.map(e => ({ client: e.client_name, total: e.total_amount, status: e.status })))}><Download className="h-4 w-4 mr-2"/> Export</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div className="p-4 bg-gray-50 rounded-lg border text-center">
                  <div className="text-3xl font-bold text-gray-800">{filteredEstimates.length}</div>
                  <div className="text-sm text-gray-500 uppercase font-semibold mt-1">Total Created</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                  <div className="text-3xl font-bold text-green-700">{metrics.estimatesApproved}</div>
                  <div className="text-sm text-green-600 uppercase font-semibold mt-1">Approved</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Jobs Summary</CardTitle>
                <CardDescription>Active vs Completed operations.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => exportCSV('Jobs_Report', filteredJobs)}><Download className="h-4 w-4 mr-2"/> Export</Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 max-w-md">
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                  <div className="text-3xl font-bold text-yellow-700">{filteredJobs.filter(j => j.status === 'scheduled').length}</div>
                  <div className="text-sm text-yellow-600 uppercase font-semibold mt-1">Scheduled</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                  <div className="text-3xl font-bold text-blue-700">{filteredJobs.filter(j => j.status === 'in_progress').length}</div>
                  <div className="text-sm text-blue-600 uppercase font-semibold mt-1">In Progress</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
                  <div className="text-3xl font-bold text-green-700">{filteredJobs.filter(j => j.status === 'completed').length}</div>
                  <div className="text-sm text-green-600 uppercase font-semibold mt-1">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Finance Breakdown</CardTitle>
                <CardDescription>Revenue sources and expense categories.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => exportCSV('Revenue_Report', filteredPayments.map(p => ({ date: p.payment_date, amount: p.amount, method: p.method })))}><Download className="h-4 w-4 mr-2"/> Revenue</Button>
                <Button size="sm" variant="outline" onClick={() => exportCSV('Expenses_Report', filteredExpenses.map(e => ({ date: e.receipt_date, amount: e.amount, category: e.expense_category })))}><Download className="h-4 w-4 mr-2"/> Expenses</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">Revenue by Method</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(filteredPayments.map(p => p.method))).map(method => {
                      const total = filteredPayments.filter(p => p.method === method).reduce((s, p) => s + p.amount, 0);
                      return (
                        <div key={method} className="bg-gray-50 border px-4 py-2 rounded-lg">
                           <div className="text-xs text-gray-500 uppercase font-semibold">{method.replace('_', ' ')}</div>
                           <div className="font-bold text-gray-900">{formatCurrency(total)}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3">Expenses by Category</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(filteredExpenses.map(e => e.expense_category))).map(cat => {
                      const total = filteredExpenses.filter(e => e.expense_category === cat).reduce((s, e) => s + e.amount, 0);
                      return (
                        <div key={cat} className="bg-gray-50 border px-4 py-2 rounded-lg">
                           <div className="text-xs text-gray-500 uppercase font-semibold">{cat.replace(/_/g, ' ')}</div>
                           <div className="font-bold text-gray-900">{formatCurrency(total)}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
