import { useState, useEffect, useMemo } from "react";
import { getExpenses, Expense } from "@/lib/expenses";
import { getClientPayments, ClientPayment } from "@/lib/client-payments";
import { useUser } from "@/context/UserContext";
import { Calculator, Download, Printer, AlertTriangle, FileText, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function TaxCenter() {
  const { user } = useUser();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

  useEffect(() => {
    async function loadData() {
      if (!user?.organization?.id) return;
      setIsLoading(true);
      try {
        const [expData, payData] = await Promise.all([
          getExpenses(user.organization.id),
          getClientPayments(user.organization.id)
        ]);
        setExpenses(expData);
        setPayments(payData);
      } catch (err) {
        console.error("Error loading tax center data", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Filters
  const yearExpenses = useMemo(() => {
    return expenses.filter(e => {
      const eDate = new Date(e.receipt_date);
      return eDate.getFullYear().toString() === selectedYear;
    });
  }, [expenses, selectedYear]);

  const yearPayments = useMemo(() => {
    return payments.filter(p => {
      const pDate = new Date(p.payment_date);
      return pDate.getFullYear().toString() === selectedYear;
    });
  }, [payments, selectedYear]);

  // Metrics
  const metrics = useMemo(() => {
    const grossPayments = yearPayments
      .filter(p => p.status === 'received')
      .reduce((sum, p) => sum + p.amount, 0);

    const activeExpenses = yearExpenses.filter(e => e.status === 'active');
    const totalExpenses = activeExpenses.reduce((sum, e) => sum + e.amount, 0);

    const materialsCosts = activeExpenses
      .filter(e => e.expense_category === 'job_material')
      .reduce((sum, e) => sum + e.amount, 0);

    const ownerReimbursements = activeExpenses
      .filter(e => e.reimbursable_to_owner || e.expense_category === 'owner_reimbursable' || e.expense_category === 'partner_reimbursable')
      .reduce((sum, e) => sum + e.amount, 0);

    const clientReimbursables = activeExpenses
      .filter(e => e.bill_to_client || e.expense_category === 'client_reimbursable')
      .reduce((sum, e) => sum + e.amount, 0);

    const missingReceiptFiles = activeExpenses.filter(e => !e.receipt_files || e.receipt_files.length === 0);

    // Needs review logic
    const needsReviewExpenses = activeExpenses.filter(e => 
      e.expense_category === 'needs_review' || 
      !e.tax_category || 
      (!e.receipt_files || e.receipt_files.length === 0)
    );
    
    // For payments, needs review might mean cancelled or no customer name
    const needsReviewPayments = yearPayments.filter(p => 
      p.status === 'cancelled' || !p.customer_name
    );

    const totalNeedsReview = needsReviewExpenses.length + needsReviewPayments.length;
    const netBeforeAccountant = grossPayments - totalExpenses;

    return {
      grossPayments,
      totalExpenses,
      materialsCosts,
      ownerReimbursements,
      clientReimbursables,
      missingReceiptFilesCount: missingReceiptFiles.length,
      needsReviewCount: totalNeedsReview,
      needsReviewExpenses,
      needsReviewPayments,
      netBeforeAccountant
    };
  }, [yearExpenses, yearPayments]);

  const exportCSV = (filename: string, rows: object[]) => {
    if (!rows || !rows.length) return;
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
    link.setAttribute("download", `${filename}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadExpensesCSV = () => {
    const data = yearExpenses.map(e => ({
      Date: e.receipt_date,
      Vendor: e.vendor,
      Amount: e.amount,
      Category: e.expense_category,
      TaxCategory: e.tax_category || "",
      PaymentSource: e.payment_source,
      PaymentMethod: e.payment_method,
      HasReceipt: e.receipt_files && e.receipt_files.length > 0 ? "Yes" : "No",
      Status: e.status
    }));
    exportCSV("Expenses", data);
  };

  const downloadPaymentsCSV = () => {
    const data = yearPayments.map(p => ({
      Date: p.payment_date,
      Customer: p.customer_name || "Unknown",
      Amount: p.amount,
      Method: p.method,
      Status: p.status,
      ReceiptStatus: p.receipt_status
    }));
    exportCSV("Client_Payments", data);
  };

  const downloadReimbursementsCSV = () => {
    const data = yearExpenses
      .filter(e => e.reimbursable_to_owner || e.expense_category === 'owner_reimbursable' || e.expense_category === 'partner_reimbursable')
      .map(e => ({
        Date: e.receipt_date,
        PaidBy: e.paid_by_name || "Unknown",
        Vendor: e.vendor,
        Amount: e.amount,
        Status: e.reimbursement_status
      }));
    exportCSV("Reimbursements", data);
  };

  const downloadMissingReceiptsCSV = () => {
    const data = yearExpenses
      .filter(e => !e.receipt_files || e.receipt_files.length === 0)
      .map(e => ({
        Date: e.receipt_date,
        Vendor: e.vendor,
        Amount: e.amount,
        Category: e.expense_category
      }));
    exportCSV("Missing_Receipts", data);
  };

  const handlePrint = () => {
    window.print();
  };

  if (user?.organization?.role === 'worker') {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-red-500 font-bold">Access Denied: Workers cannot view the Tax Center.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="p-8">Loading Tax Center...</div>;
  }

  const formatCurrency = (val: number) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0b2a4a] flex items-center gap-2">
            <Calculator className="h-8 w-8 text-blue-600" />
            Tax Center / Year-End Package
          </h1>
          <p className="text-gray-500 mt-1">Organize your financial data for your accountant.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border">
          <span className="text-sm font-semibold text-gray-600 ml-2">Tax Year:</span>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32 border-none shadow-none font-bold text-[#0b2a4a]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3].map(offset => (
                <SelectItem key={offset} value={(currentYear - offset).toString()}>
                  {currentYear - offset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-xl flex items-start gap-3 shadow-sm print:hidden">
        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
        <p className="text-sm font-medium">
          <strong>Disclaimer:</strong> This is an organization report, not tax advice. Please review these figures with your certified accountant or CPA before filing your taxes. We do not determine final tax deductibility.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-white border rounded-xl p-1 shadow-sm overflow-x-auto flex-nowrap w-full justify-start print:hidden">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="payments">Client Payments</TabsTrigger>
          <TabsTrigger value="reimbursements">Reimbursements</TabsTrigger>
          <TabsTrigger value="review" className="relative">
            Needs Review
            {metrics.needsReviewCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {metrics.needsReviewCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="exports">Accountant Package</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-blue-50/50 border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-800 font-semibold uppercase tracking-wider">Gross Client Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-900">{formatCurrency(metrics.grossPayments)}</div>
                <p className="text-xs text-blue-600 mt-1">Total 'received' status</p>
              </CardContent>
            </Card>

            <Card className="bg-red-50/50 border-red-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-800 font-semibold uppercase tracking-wider">Total Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-900">{formatCurrency(metrics.totalExpenses)}</div>
                <p className="text-xs text-red-600 mt-1">Total 'active' status</p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50/50 border-purple-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-purple-800 font-semibold uppercase tracking-wider">Materials / Job Costs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900">{formatCurrency(metrics.materialsCosts)}</div>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50/50 border-emerald-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-emerald-800 font-semibold uppercase tracking-wider">Net Before Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-900">{formatCurrency(metrics.netBeforeAccountant)}</div>
                <p className="text-xs text-emerald-600 mt-1">Gross - Expenses</p>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 font-semibold uppercase tracking-wider">Owner Reimbursements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.ownerReimbursements)}</div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600 font-semibold uppercase tracking-wider">Client Reimbursables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.clientReimbursables)}</div>
              </CardContent>
            </Card>

            <Card className={`${metrics.missingReceiptFilesCount > 0 ? 'bg-orange-50/50 border-orange-200' : 'border-gray-200'} shadow-sm`}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-semibold uppercase tracking-wider ${metrics.missingReceiptFilesCount > 0 ? 'text-orange-800' : 'text-gray-600'}`}>Missing Receipts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metrics.missingReceiptFilesCount > 0 ? 'text-orange-900' : 'text-gray-900'}`}>{metrics.missingReceiptFilesCount} items</div>
              </CardContent>
            </Card>

            <Card className={`${metrics.needsReviewCount > 0 ? 'bg-red-50/50 border-red-200' : 'border-gray-200'} shadow-sm`}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm font-semibold uppercase tracking-wider ${metrics.needsReviewCount > 0 ? 'text-red-800' : 'text-gray-600'}`}>Needs Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metrics.needsReviewCount > 0 ? 'text-red-900' : 'text-gray-900'}`}>{metrics.needsReviewCount} items</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Expenses Summary ({selectedYear})</CardTitle>
              <CardDescription>All active expenses for the selected year.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 font-semibold text-gray-600">Date</th>
                      <th className="p-3 font-semibold text-gray-600">Vendor</th>
                      <th className="p-3 font-semibold text-gray-600">Amount</th>
                      <th className="p-3 font-semibold text-gray-600">Category</th>
                      <th className="p-3 font-semibold text-gray-600">Tax Category</th>
                      <th className="p-3 font-semibold text-gray-600">Source / Method</th>
                      <th className="p-3 font-semibold text-gray-600">Receipt?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearExpenses.map(e => (
                      <tr key={e.id} className="border-b hover:bg-gray-50/50">
                        <td className="p-3">{new Date(e.receipt_date).toLocaleDateString()}</td>
                        <td className="p-3 font-medium">{e.vendor}</td>
                        <td className="p-3 font-semibold">{formatCurrency(e.amount)}</td>
                        <td className="p-3 capitalize">{e.expense_category.replace(/_/g, " ")}</td>
                        <td className="p-3 text-gray-500">{e.tax_category || <span className="text-red-400">Missing</span>}</td>
                        <td className="p-3 capitalize text-xs">{e.payment_source.replace(/_/g, " ")}<br/>via {e.payment_method}</td>
                        <td className="p-3 text-center">
                          {e.receipt_files && e.receipt_files.length > 0 ? (
                             <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                          ) : (
                             <XCircle className="h-4 w-4 text-red-400 inline" />
                          )}
                        </td>
                      </tr>
                    ))}
                    {yearExpenses.length === 0 && (
                      <tr><td colSpan={7} className="p-4 text-center text-gray-500">No expenses found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Client Payments Summary ({selectedYear})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 font-semibold text-gray-600">Date</th>
                      <th className="p-3 font-semibold text-gray-600">Customer</th>
                      <th className="p-3 font-semibold text-gray-600">Amount</th>
                      <th className="p-3 font-semibold text-gray-600">Method</th>
                      <th className="p-3 font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearPayments.map(p => (
                      <tr key={p.id} className="border-b hover:bg-gray-50/50">
                        <td className="p-3">{new Date(p.payment_date).toLocaleDateString()}</td>
                        <td className="p-3 font-medium">{p.customer_name || '—'}</td>
                        <td className="p-3 font-semibold text-blue-700">{formatCurrency(p.amount)}</td>
                        <td className="p-3 capitalize">{p.method}</td>
                        <td className="p-3">
                          <Badge variant={p.status === 'received' ? 'default' : 'secondary'}>{p.status}</Badge>
                        </td>
                      </tr>
                    ))}
                    {yearPayments.length === 0 && (
                      <tr><td colSpan={5} className="p-4 text-center text-gray-500">No payments found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reimbursements">
          <Card>
            <CardHeader>
              <CardTitle>Reimbursements Summary ({selectedYear})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 font-semibold text-gray-600">Date</th>
                      <th className="p-3 font-semibold text-gray-600">Paid By</th>
                      <th className="p-3 font-semibold text-gray-600">Vendor</th>
                      <th className="p-3 font-semibold text-gray-600">Amount</th>
                      <th className="p-3 font-semibold text-gray-600">Source</th>
                      <th className="p-3 font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearExpenses.filter(e => e.reimbursable_to_owner || e.expense_category === 'owner_reimbursable' || e.expense_category === 'partner_reimbursable').map(e => (
                      <tr key={e.id} className="border-b hover:bg-gray-50/50">
                        <td className="p-3">{new Date(e.receipt_date).toLocaleDateString()}</td>
                        <td className="p-3 font-medium">{e.paid_by_name || 'Unknown'}</td>
                        <td className="p-3">{e.vendor}</td>
                        <td className="p-3 font-semibold">{formatCurrency(e.amount)}</td>
                        <td className="p-3 capitalize">{e.payment_source.replace(/_/g, ' ')}</td>
                        <td className="p-3">
                          <Badge variant="outline">{e.reimbursement_status.replace(/_/g, ' ')}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card className="border-red-200">
            <CardHeader className="bg-red-50/30">
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" /> Items Needing Attention
              </CardTitle>
              <CardDescription>Missing files, uncategorized taxes, or cancelled payments that impact the books.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {metrics.needsReviewExpenses.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 border-b pb-2">Expenses Needing Review</h3>
                  <div className="space-y-2">
                    {metrics.needsReviewExpenses.map(e => (
                      <div key={e.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                        <div>
                          <span className="font-semibold mr-2">{e.vendor}</span>
                          <span className="text-gray-500 text-sm">({new Date(e.receipt_date).toLocaleDateString()})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">{formatCurrency(e.amount)}</span>
                          <div className="flex flex-col gap-1 items-end text-[10px] uppercase font-bold tracking-wider">
                            {!e.tax_category && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">No Tax Cat</span>}
                            {(!e.receipt_files || e.receipt_files.length === 0) && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Missing File</span>}
                            {e.expense_category === 'needs_review' && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Needs Review</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {metrics.needsReviewPayments.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 border-b pb-2">Client Payments Needing Review</h3>
                  <div className="space-y-2">
                    {metrics.needsReviewPayments.map(p => (
                      <div key={p.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                        <div>
                          <span className="font-semibold mr-2">{p.customer_name || 'Unknown Client'}</span>
                          <span className="text-gray-500 text-sm">({new Date(p.payment_date).toLocaleDateString()})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-blue-700">{formatCurrency(p.amount)}</span>
                          <div className="flex flex-col gap-1 items-end text-[10px] uppercase font-bold tracking-wider">
                            {p.status === 'cancelled' && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">Cancelled</span>}
                            {!p.customer_name && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded">Missing Name</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {metrics.needsReviewCount === 0 && (
                <div className="text-center p-8 text-green-600 font-medium flex flex-col items-center">
                  <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
                  All clear! No items currently need review for {selectedYear}.
                </div>
              )}

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exports">
          <Card>
            <CardHeader>
              <CardTitle>Accountant Package Exports</CardTitle>
              <CardDescription>Download structured CSV data or print the overview summary.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                <Button variant="outline" className="h-16 justify-start px-4 flex gap-3" onClick={downloadExpensesCSV}>
                  <div className="bg-blue-100 p-2 rounded text-blue-700"><Download className="h-5 w-5" /></div>
                  <div className="text-left"><p className="font-bold">Expenses CSV</p><p className="text-xs text-gray-500">All active expenses</p></div>
                </Button>

                <Button variant="outline" className="h-16 justify-start px-4 flex gap-3" onClick={downloadPaymentsCSV}>
                  <div className="bg-green-100 p-2 rounded text-green-700"><Download className="h-5 w-5" /></div>
                  <div className="text-left"><p className="font-bold">Client Payments CSV</p><p className="text-xs text-gray-500">Received & cancelled</p></div>
                </Button>

                <Button variant="outline" className="h-16 justify-start px-4 flex gap-3" onClick={downloadReimbursementsCSV}>
                  <div className="bg-purple-100 p-2 rounded text-purple-700"><Download className="h-5 w-5" /></div>
                  <div className="text-left"><p className="font-bold">Reimbursements CSV</p><p className="text-xs text-gray-500">Owner & partner related</p></div>
                </Button>

                <Button variant="outline" className="h-16 justify-start px-4 flex gap-3" onClick={downloadMissingReceiptsCSV}>
                  <div className="bg-orange-100 p-2 rounded text-orange-700"><Download className="h-5 w-5" /></div>
                  <div className="text-left"><p className="font-bold">Missing Receipts CSV</p><p className="text-xs text-gray-500">Expenses w/o files</p></div>
                </Button>

                <Button variant="default" className="h-16 justify-start px-4 flex gap-3 bg-[#0b2a4a] hover:bg-[#081e35] col-span-full sm:col-span-2 lg:col-span-1" onClick={handlePrint}>
                  <div className="bg-blue-900 p-2 rounded text-white"><Printer className="h-5 w-5" /></div>
                  <div className="text-left"><p className="font-bold">Print Summary</p><p className="text-xs text-blue-200">Print overview cards</p></div>
                </Button>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
