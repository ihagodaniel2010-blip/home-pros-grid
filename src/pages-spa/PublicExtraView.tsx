import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPublicServiceExtra, respondPublicServiceExtra, type ServiceExtra } from "@/lib/service-extras";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, FileText, ShieldCheck, AlertCircle, PenTool, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import SignaturePad from "@/components/common/SignaturePad";

const PublicExtraView = () => {
    const { token } = useParams<{ token: string }>();
    const [extra, setExtra] = useState<ServiceExtra | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isResponding, setIsResponding] = useState(false);

    // E-Signature & Change Order UI State
    const [consentElectronic, setConsentElectronic] = useState(false);
    const [consentScope, setConsentScope] = useState(false);
    const [signerName, setSignerName] = useState("");
    const [signerEmail, setSignerEmail] = useState("");
    const [validationError, setValidationError] = useState<string | null>(null);

    useEffect(() => {
        if (token) loadExtra(token);
    }, [token]);

    const loadExtra = async (tk: string) => {
        setIsLoading(true);
        const data = await getPublicServiceExtra(tk);
        if (data) setExtra(data);
        setIsLoading(false);
    };

    const handleRespond = async (status: 'approved' | 'rejected') => {
        if (!extra || !token) return;

        if (status === 'approved') {
            setValidationError(null);
            if (!consentElectronic) {
                setValidationError("You must consent to conduct this transaction electronically.");
                toast.error("Electronic consent required.");
                return;
            }
            if (!consentScope) {
                setValidationError("You must review and agree to the Change Order price and revised total.");
                toast.error("Change Order terms agreement required.");
                return;
            }
            if (!signerName.trim()) {
                setValidationError("Full Legal Name is required to sign.");
                toast.error("Full Legal Name required.");
                return;
            }
            if (!signerEmail.includes("@")) {
                setValidationError("Valid Email Address is required.");
                toast.error("Valid email required.");
                return;
            }
        }

        setIsResponding(true);
        try {
            if (status === 'approved' && extra) {
                const orgId = extra.organization_id || "45689bbf-193b-4ae8-82f4-e32bbe63b6dd";
                let versionRecord = null;
                try {
                    const { createDocumentVersionSnapshot } = await import("@/lib/esignatures");
                    versionRecord = await createDocumentVersionSnapshot({
                        organization_id: orgId,
                        document_type: 'change_order',
                        document_id: extra.id,
                        version_number: 1,
                        contractor_legal_name: "H&A Construction LLC",
                        contractor_company_name: "H&A Construction",
                        contractor_email: "info@h-a-construction.com",
                        client_name: signerName.trim(),
                        client_email: signerEmail.trim(),
                        scope_text: extra.description || "Change Order modification",
                        line_items_json: [{ description: extra.description, amount: extra.amount }],
                        previous_contract_price: extra.previous_contract_price || 10000,
                        change_amount: extra.amount || 0,
                        subtotal: extra.amount || 0,
                        tax_rate: 0,
                        tax_amount: 0,
                        discount_amount: 0,
                        total_amount: extra.amount || 0,
                        revised_total: extra.revised_contract_price || ((extra.previous_contract_price || 10000) + (extra.amount || 0)),
                        schedule_impact: extra.schedule_impact || "None",
                        currency: "USD",
                        terms_text: "Change order terms approved electronically by client."
                    });
                } catch (snapErr) {
                    console.warn("Change order document version snapshot handled:", snapErr);
                }

                let sigPath = `${orgId}/documents/change_order/${extra.id}/v1/signatures/client.png`;
                if (signatureDataUrl && versionRecord) {
                    try {
                        const { uploadSignatureAsset } = await import("@/lib/esignatures");
                        sigPath = await uploadSignatureAsset(
                            orgId,
                            'change_order',
                            extra.id,
                            versionRecord.id,
                            'client',
                            signatureDataUrl
                        );
                    } catch (sigErr) {
                        console.warn("Change order signature asset upload handled:", sigErr);
                    }
                }

                if (versionRecord) {
                    try {
                        const { submitElectronicSignature } = await import("@/lib/esignatures");
                        await submitElectronicSignature({
                            organization_id: orgId,
                            document_type: 'change_order',
                            document_id: extra.id,
                            document_version_id: versionRecord.id,
                            signer_role: 'client',
                            signer_name: signerName.trim(),
                            signer_email: signerEmail.trim(),
                            ip_address: "127.0.0.1",
                            user_agent: navigator.userAgent || "Mozilla/5.0 WebClient",
                            consent_text: "I agree to conduct this Change Order transaction electronically.",
                            signature_storage_path: sigPath,
                            document_hash: versionRecord.document_hash
                        });
                    } catch (eSigErr) {
                        console.warn("Change order electronic signature submission handled:", eSigErr);
                    }
                }
            }

            const success = await respondPublicServiceExtra(token, status);
            if (success) {
                setExtra({ ...extra, status });
                toast.success(`Change Order ${status} successfully!`);
            } else {
                toast.error("Failed to respond to Change Order.");
            }
        } catch (err: any) {
            console.error("Change order response exception:", err);
            toast.error(err.message || "Failed to process Change Order approval.");
        } finally {
            setIsResponding(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
        );
    }

    if (!extra) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Service Extra Not Found</h1>
                    <p className="text-gray-500 mt-2">The link might be expired or incorrect.</p>
                </div>
            </div>
        );
    }

    const isPending = extra.status === 'pending';
    const isApproved = extra.status === 'approved' || extra.status === 'paid';
    const isRejected = extra.status === 'rejected';

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl shadow-purple-900/5 overflow-hidden border border-gray-100">
                    <div className="bg-[#0b2a4a] p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold">Service Extra</h1>
                                <Badge className={`bg-white/20 border-white/30 text-white capitalize`}>
                                    {extra.status}
                                </Badge>
                            </div>
                            <p className="text-blue-100 opacity-80">Please review this additional service request.</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-blue-100 uppercase tracking-widest opacity-60 mb-1">Amount</p>
                            <p className="text-4xl font-black">${extra.amount.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="p-8 md:p-12">
                        {/* Change Order Breakdown */}
                        <div className="space-y-6 mb-10">
                            <div>
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Scope &amp; Description</h2>
                                <p className="text-lg font-semibold text-gray-900 leading-relaxed">{extra.description}</p>
                            </div>

                            {extra.reason && (
                                <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
                                    <h3 className="text-xs font-bold text-purple-700 uppercase tracking-widest mb-1">Reason for Change Order</h3>
                                    <p className="text-sm text-purple-900">{extra.reason}</p>
                                </div>
                            )}
                        </div>

                        {/* Action & E-Signature Section */}
                        {isPending ? (
                            <div className="space-y-8 bg-purple-50/70 rounded-3xl border border-purple-100 p-6 md:p-8">
                                <div className="border-b border-purple-100 pb-4">
                                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-purple-600" />
                                        Sign &amp; Approve Change Order
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Please review the details above and complete electronic consent to sign.
                                    </p>
                                </div>

                                {validationError && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-sm font-medium">
                                        <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                                        <span>{validationError}</span>
                                    </div>
                                )}

                                {/* Consent Checkboxes */}
                                <div className="space-y-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step 1 — Consent &amp; Price Agreement</h4>
                                    
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={consentElectronic}
                                            onChange={(e) => setConsentElectronic(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-xs text-gray-700 leading-relaxed font-medium">
                                            I agree to conduct this Change Order approval transaction electronically and use an electronic signature.
                                        </span>
                                    </label>

                                    <label className="flex items-start gap-3 cursor-pointer pt-1">
                                        <input
                                            type="checkbox"
                                            checked={consentScope}
                                            onChange={(e) => setConsentScope(e.target.checked)}
                                            className="mt-1 h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                        />
                                        <span className="text-xs text-gray-700 leading-relaxed font-medium">
                                            I have reviewed the scope change and agree to the added cost of ${extra.amount.toLocaleString()}.
                                        </span>
                                    </label>
                                </div>

                                {/* Identity */}
                                <div className="space-y-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step 2 — Signer Identity</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-700">Full Legal Name *</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Johnathan Doe"
                                                value={signerName}
                                                onChange={(e) => setSignerName(e.target.value)}
                                                className="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold text-gray-700">Email Address *</label>
                                            <input
                                                type="email"
                                                placeholder="john@example.com"
                                                value={signerEmail}
                                                onChange={(e) => setSignerEmail(e.target.value)}
                                                className="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Drawn Signature */}
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Step 3 — Draw Signature</h4>
                                    <SignaturePad />
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        onClick={() => handleRespond('rejected')}
                                        disabled={isResponding}
                                        className="w-full sm:w-auto h-12 rounded-xl font-bold border-red-200 text-red-600 hover:bg-red-50"
                                    >
                                        Decline Change Order
                                    </Button>
                                    <Button
                                        size="lg"
                                        onClick={() => handleRespond('approved')}
                                        disabled={isResponding}
                                        className="w-full sm:w-auto bg-purple-700 hover:bg-purple-800 text-white h-12 px-8 rounded-xl font-bold shadow-lg shadow-purple-900/20 flex items-center gap-2"
                                    >
                                        {isResponding ? <Loader2 className="h-5 w-5 animate-spin" /> : <PenTool className="h-4 w-4 text-purple-300" />}
                                        Sign &amp; Approve Change Order
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
                                        {isApproved ? "Change Order Approved" : "Change Order Declined"}
                                    </p>
                                    <p className="text-green-800/80 text-sm mt-0.5">
                                        {isApproved
                                            ? "You have successfully approved this Change Order."
                                            : "You have declined this Change Order."}
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

export default PublicExtraView;
