import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getEstimateByToken, approveEstimate, rejectEstimate, updateEstimate, Estimate } from "@/lib/estimates";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, FileText, Download, ShieldCheck, PenTool, CheckSquare, Square, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SignaturePad from "@/components/common/SignaturePad";

const PublicView = () => {
    const { token } = useParams<{ token: string }>();
    const [estimate, setEstimate] = useState<Estimate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isApproving, setIsApproving] = useState(false);
    const [isApproved, setIsApproved] = useState(false);

    // 4-Step E-Signature UI State
    const [consentElectronic, setConsentElectronic] = useState(false);
    const [consentScope, setConsentScope] = useState(false);
    const [signerName, setSignerName] = useState("");
    const [signerEmail, setSignerEmail] = useState("");
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

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
            if (data.client_name) setSignerName(data.client_name);
            if (data.client_email) setSignerEmail(data.client_email);
            if (data.status === 'Approved' || data.status === 'Paid') {
                setIsApproved(true);
            }
        }
        setIsLoading(false);
    };

    const handleApprove = async () => {
        if (!estimate) return;

        setValidationError(null);
        if (!consentElectronic) {
            setValidationError("You must check the agreement to conduct this transaction electronically.");
            toast.error("Electronic consent required.");
            return;
        }
        if (!consentScope) {
            setValidationError("You must agree to the scope of work, pricing, and terms.");
            toast.error("Scope & terms agreement required.");
            return;
        }
        if (!signerName || !signerName.trim()) {
            setValidationError("Full Legal Name is required to sign.");
            toast.error("Full Legal Name required.");
            return;
        }
        if (!signerEmail || !signerEmail.includes("@")) {
            setValidationError("A valid Email Address is required.");
            toast.error("Valid email required.");
            return;
        }

        setIsApproving(true);
        const success = await approveEstimate(estimate.id, token);
        if (success) {
            setIsApproved(true);
            toast.success("Estimate successfully signed and approved!");
        } else {
            toast.error("Failed to approve estimate.");
        }
        setIsApproving(false);
    };

    const handleReject = async () => {
        if (!estimate) return;
        setIsApproving(true);
        const success = await rejectEstimate(estimate.id, token);
        if (success) {
            setEstimate({ ...estimate, status: 'Rejected' });
            toast.success("Estimate declined.");
        } else {
            toast.error("Failed to decline estimate.");
        }
        setIsApproving(false);
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'draft': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'viewed': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'approved': return 'bg-green-100 text-green-700 border-green-200';
            case 'declined':
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
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

    const isDeclined = estimate.status === 'Rejected';

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

                        {/* Action & E-Signature Section */}
                        {!isApproved && !isDeclined ? (
                            <div className="space-y-8 bg-blue-50/70 rounded-3xl border border-blue-100 p-6 md:p-8">
                                <div className="border-b border-blue-100 pb-4">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-blue-600" />
                                        Electronic Signature & Proposal Approval
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Please complete the required consent, legal identity, and signature below to approve this estimate.
                                    </p>
                                </div>

                                {validationError && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-medium">
                                        <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                                        <span>{validationError}</span>
                                    </div>
                                )}

                                {/* STEP 2: Electronic Consent */}
                                <div className="space-y-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step 1 of 3 — Consent & Terms</h4>
                                    
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={consentElectronic}
                                            onChange={(e) => setConsentElectronic(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-gray-700 leading-relaxed font-medium">
                                            I have reviewed this estimate and agree to conduct this transaction electronically and use an electronic signature (UETA / E-SIGN Act Compliance).
                                        </span>
                                    </label>

                                    <label className="flex items-start gap-3 cursor-pointer group pt-1">
                                        <input
                                            type="checkbox"
                                            checked={consentScope}
                                            onChange={(e) => setConsentScope(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-gray-700 leading-relaxed font-medium">
                                            I have read, understood, and agree to the scope of work, pricing total (${estimate.total_amount.toLocaleString()}), terms, and conditions shown above.
                                        </span>
                                    </label>
                                </div>

                                {/* STEP 3: Signer Identity */}
                                <div className="space-y-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step 2 of 3 — Signer Identity</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-700">Full Legal Name *</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Johnathan Doe"
                                                value={signerName}
                                                onChange={(e) => setSignerName(e.target.value)}
                                                className="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-700">Email Address *</label>
                                            <input
                                                type="email"
                                                placeholder="john@example.com"
                                                value={signerEmail}
                                                onChange={(e) => setSignerEmail(e.target.value)}
                                                className="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* STEP 4: Drawn Signature */}
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Step 3 of 3 — Draw Signature</h4>
                                    <SignaturePad onSignatureChange={(dataUrl) => setSignatureDataUrl(dataUrl)} />
                                </div>

                                {/* Submit Buttons */}
                                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={handleReject}
                                        disabled={isApproving}
                                        className="w-full sm:w-auto h-12 rounded-xl font-bold border-red-200 text-red-600 hover:bg-red-50"
                                    >
                                        Decline Estimate
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={handleApprove}
                                        disabled={isApproving}
                                        className="w-full sm:w-auto bg-[#0b2a4a] hover:bg-[#081e35] text-white h-12 px-8 rounded-xl font-bold shadow-lg shadow-blue-900/10 flex items-center gap-2"
                                    >
                                        {isApproving ? <Loader2 className="h-5 w-5 animate-spin" /> : <PenTool className="h-4 w-4 text-blue-400" />}
                                        Sign &amp; Approve Estimate
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 p-8 bg-green-50 rounded-3xl border border-green-200">
                                <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-white shrink-0">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="text-gray-900 font-bold text-lg">
                                        {isApproved ? "Estimate Successfully Signed & Approved" : "Estimate Declined"}
                                    </p>
                                    <p className="text-green-800/80 text-sm mt-0.5">
                                        {isApproved
                                            ? `Approved on ${new Date(estimate.approved_at || Date.now()).toLocaleDateString()}. Thank you for choosing H&A Construction!`
                                            : "This estimate was declined."}
                                    </p>
                                </div>
                            </div>
                        )}
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
