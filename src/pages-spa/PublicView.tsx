import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEstimateByToken, approveEstimate, updateEstimate, Estimate } from "@/lib/estimates";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, FileText, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PublicView = () => {
    const { token } = useParams<{ token: string }>();
    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isApproving, setIsApproving] = useState(false);
    const [isApproved, setIsApproved] = useState(false);

    useEffect(() => {
        if (token) {
            loadEstimate(token);
        }
    }, [token]);

    const loadEstimate = async (tk: string) => {
        setIsLoading(true);
        const data = await getEstimateByToken(tk);
        if (data) {
            setEstimate(data);
            if (data.status === 'Approved' || data.status === 'Paid') {
                setIsApproved(true);
            }

            // Auto-track "Viewed" status
            if (data.status === 'Sent') {
                await updateEstimate(data.id, { status: 'Viewed' });
                setEstimate(prev => prev ? { ...prev, status: 'Viewed' } : null);
            }
        }
        setIsLoading(false);
    };

    const handleApprove = async () => {
        if (!estimate) return;
        setIsApproving(true);
        const success = await approveEstimate(estimate.id);
        if (success) {
            setIsApproved(true);
            toast.success("Estimate approved successfully!");
        } else {
            toast.error("Failed to approve estimate.");
        }
        setIsApproving(false);
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'viewed': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'paid': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!estimate) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Estimate Not Found</h1>
                    <p className="text-gray-500 mt-2">The link might be expired or incorrect.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 overflow-hidden border border-gray-100">
                    {/* Header */}
                    <div className="bg-[#0b2a4a] p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold">Estimate</h1>
                                <Badge className={cn("bg-white/20 border-white/30 text-white capitalize", getStatusColor(estimate.status))}>
                                    {estimate.status}
                                </Badge>
                            </div>
                            <p className="text-blue-100 opacity-80">Reference: {estimate.id.split('-')[0].toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-blue-100 uppercase tracking-widest opacity-60 mb-1">Total Amount</p>
                            <p className="text-4xl font-black">${estimate.total_amount.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="p-8 md:p-12">
                        {/* Summary Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                            <div>
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Client Information</h2>
                                <p className="text-xl font-bold text-gray-900">{estimate.client_name}</p>
                                <p className="text-gray-600 mt-1">{estimate.client_email}</p>
                                <p className="text-gray-600">{estimate.client_phone}</p>
                                {estimate.client_address && (
                                    <div className="mt-2 text-sm text-gray-500">
                                        <p>{estimate.client_address}</p>
                                        <p>{estimate.client_city}, {estimate.client_state} {estimate.client_zip}</p>
                                    </div>
                                )}
                            </div>
                            <div className="md:text-right">
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Estimate Details</h2>
                                <p className="text-gray-600"><span className="font-semibold text-gray-900">Date:</span> {new Date(estimate.created_at).toLocaleDateString()}</p>
                                {estimate.valid_until && (
                                    <p className="text-gray-600"><span className="font-semibold text-gray-900">Valid Until:</span> {new Date(estimate.valid_until).toLocaleDateString()}</p>
                                )}
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-12">
                            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Service Overview</h2>
                            <div className="border border-gray-100 rounded-2xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase">Description</th>
                                            <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase text-center">Qty</th>
                                            <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase text-right">Price</th>
                                            <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {estimate.items?.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="py-4 px-6 text-gray-900 font-medium">{item.description}</td>
                                                <td className="py-4 px-6 text-gray-600 text-center">{item.quantity}</td>
                                                <td className="py-4 px-6 text-gray-600 text-right">${item.unit_price.toLocaleString()}</td>
                                                <td className="py-4 px-6 text-gray-900 font-bold text-right">${item.total_price.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Totals Section */}
                        <div className="flex flex-col items-end gap-3 mb-12 border-t border-gray-50 pt-8">
                            <div className="flex justify-between w-full max-w-[240px] text-gray-500">
                                <span>Subtotal</span>
                                <span className="font-medium text-gray-900">${estimate.subtotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between w-full max-w-[240px] text-gray-500">
                                <span>Tax ({estimate.tax_rate}%)</span>
                                <span className="font-medium text-gray-900">${estimate.tax_amount.toLocaleString()}</span>
                            </div>
                            {estimate.discount_amount > 0 && (
                                <div className="flex justify-between w-full max-w-[240px] text-red-500">
                                    <span>Discount</span>
                                    <span className="font-medium">-${estimate.discount_amount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between w-full max-w-[240px] text-xl font-black text-gray-900 pt-3 border-t border-gray-100">
                                <span>Total</span>
                                <span className="text-blue-600">${estimate.total_amount.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Terms */}
                        {estimate.terms && (
                            <div className="mb-12 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Terms & Conditions</h2>
                                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{estimate.terms}</p>
                            </div>
                        )}

                        {/* Action Section */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-8 bg-blue-50 rounded-3xl border border-blue-100">
                            <div className="flex items-center gap-4">
                                {isApproved ? (
                                    <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-white">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                ) : (
                                    <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                )}
                                <div>
                                    <p className="text-gray-900 font-bold text-lg">
                                        {isApproved ? "Approved & Verified" : "Ready for your approval"}
                                    </p>
                                    <p className="text-blue-700/60 text-sm">
                                        {isApproved
                                            ? `This estimate was approved on ${new Date(estimate.approved_at || Date.now()).toLocaleDateString()}`
                                            : "Please review and approve to proceed with the project."}
                                    </p>
                                </div>
                            </div>

                            {!isApproved && (
                                <Button
                                    size="lg"
                                    onClick={handleApprove}
                                    disabled={isApproving}
                                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[200px] h-14 rounded-2xl text-lg font-bold shadow-lg shadow-blue-600/20"
                                >
                                    {isApproving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Approve Estimate"}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center text-gray-400 text-sm">
                    <p>© {new Date().getFullYear()} Secure Document Viewer. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};

export default PublicView;
