import { useEffect, useState } from "react";
import { getClientPayments, ClientPayment, createClientPayment, updateClientPayment, PaymentMethod } from "@/lib/client-payments";
import { useUser } from "@/context/UserContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Copy, Link as LinkIcon, Plus, ExternalLink, Send, CheckCircle, Ban } from "lucide-react";
import { toast } from "sonner";
import { getServiceJobs } from "@/lib/service-jobs";
import { getEstimates } from "@/lib/estimates";

export default function ClientReceipts() {
  const { user } = useUser();
  const [payments, setPayments] = useState<ClientPayment[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [estimates, setEstimates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<ClientPayment>>({
    amount: 0,
    customer_name: "",
    payment_date: new Date().toISOString().split('T')[0],
    method: "card",
    status: "received",
    receipt_status: "draft"
  });

  useEffect(() => {
    fetchData();
  }, [user]);

  async function fetchData() {
    if (!user?.organization?.id) return;
    setIsLoading(true);
    try {
      const [fetchedPayments, fetchedJobs, fetchedEstimates] = await Promise.all([
        getClientPayments(user.organization.id),
        getServiceJobs(user.organization.id),
        getEstimates()
      ]);
      setPayments(fetchedPayments);
      setJobs(fetchedJobs);
      setEstimates(fetchedEstimates);
    } catch (error) {
      // toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organization?.id) return;
    setIsSubmitting(true);
    try {
      await createClientPayment({
        ...formData,
        organization_id: user.organization.id
      });
      toast.success("Payment recorded");
      setIsDialogOpen(false);
      fetchData();
      setFormData({
        amount: 0, customer_name: "", payment_date: new Date().toISOString().split('T')[0], method: "card", status: "received", receipt_status: "draft"
      });
    } catch (error: any) {
      if (error?.message?.includes("does not exist") || error?.code === 'PGRST204') {
        toast.error("Database schema update needed (Fase 6.3 SQL).");
      } else {
        toast.error("Failed to record payment");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<ClientPayment>) => {
    try {
      await updateClientPayment(id, updates);
      toast.success("Updated successfully");
      fetchData();
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/public/receipt/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Public receipt link copied to clipboard!");
  };

  const getBalanceDue = (payment: ClientPayment) => {
    if (!payment.estimate_id) return null;
    const est = estimates.find(e => e.id === payment.estimate_id);
    if (!est) return null;
    
    // For MVP, just comparing this single payment. In future, sum all payments for this estimate.
    const paid = Number(payment.amount);
    const total = Number(est.total_amount || 0);
    const balance = total - paid;
    return { total, paid, balance };
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Client Payments & Receipts</h1>
          <p className="text-muted-foreground mt-1">Record incoming payments and share public receipts.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Record Client Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Customer Name</Label>
                  <Input required value={formData.customer_name || ""} onChange={e => setFormData({...formData, customer_name: e.target.value})} placeholder="E.g., John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input required type="date" value={formData.payment_date} onChange={e => setFormData({...formData, payment_date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select value={formData.method} onValueChange={(val: PaymentMethod) => setFormData({...formData, method: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="zelle">Zelle</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Related Estimate (Optional)</Label>
                  <Select value={formData.estimate_id || "none"} onValueChange={(val) => setFormData({...formData, estimate_id: val === "none" ? null : val})}>
                    <SelectTrigger><SelectValue placeholder="Select Estimate" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {estimates.map(e => (
                        <SelectItem key={e.id} value={e.id}>{e.title || `Estimate #${e.id.slice(0,8)}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Notes</Label>
                  <Input value={formData.note || ""} onChange={e => setFormData({...formData, note: e.target.value})} placeholder="Internal notes" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save Payment"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Customer</TableHead>
                <TableHead>Amount / Balance</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No payments found or SQL update pending.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map(payment => {
                  const balance = getBalanceDue(payment);
                  return (
                    <TableRow key={payment.id} className={payment.status === 'cancelled' ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="font-medium">{payment.customer_name || 'Unknown Customer'}</div>
                        <div className="text-xs text-muted-foreground">{format(new Date(payment.payment_date), "MMM d, yyyy")}</div>
                        {payment.estimate_id && <div className="text-xs text-blue-500">Estimate linked</div>}
                      </TableCell>
                      <TableCell>
                        <div className="font-bold text-green-600">${Number(payment.amount).toFixed(2)}</div>
                        {balance && balance.balance > 0 && (
                          <div className="text-[10px] text-orange-500">Bal Due: ${balance.balance.toFixed(2)}</div>
                        )}
                        {balance && balance.balance <= 0 && (
                          <div className="text-[10px] text-green-500">Fully Paid</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{payment.method.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'received' ? 'default' : 'secondary'}>{payment.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={payment.receipt_status === 'viewed' ? 'default' : payment.receipt_status === 'sent' ? 'secondary' : 'outline'}>
                            Receipt {payment.receipt_status}
                          </Badge>
                          {payment.viewed_at && <span className="text-[10px] text-muted-foreground">Viewed: {format(new Date(payment.viewed_at), "MM/dd HH:mm")}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 items-center">
                          {payment.public_token && payment.status !== 'cancelled' && (
                            <>
                              <Button variant="ghost" size="sm" title="Copy Public Link" onClick={() => copyLink(payment.public_token!)}>
                                <LinkIcon className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Mark as Sent" onClick={() => handleUpdate(payment.id, { receipt_status: 'sent', sent_at: new Date().toISOString() })}>
                                <Send className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Open Public Link" onClick={() => window.open(`/public/receipt/${payment.public_token}`, '_blank')}>
                                <ExternalLink className="w-4 h-4 text-gray-500" />
                              </Button>
                            </>
                          )}
                          {payment.status !== 'cancelled' && (
                            <Button variant="ghost" size="sm" title="Cancel Payment" onClick={() => {
                              if(confirm("Cancel this payment and receipt?")) {
                                handleUpdate(payment.id, { status: 'cancelled', receipt_status: 'cancelled', cancelled_at: new Date().toISOString() });
                              }
                            }}>
                              <Ban className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
