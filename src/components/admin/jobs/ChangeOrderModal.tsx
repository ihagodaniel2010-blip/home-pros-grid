import React, { useState } from "react";
import { X, Plus, Upload, Image as ImageIcon, Video, AlertCircle, FileText, CheckCircle2, Loader2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChangeOrderModalProps {
    isOpen: boolean;
    jobId: string;
    organizationId: string;
    estimateId?: string | null;
    previousContractPrice?: number;
    onClose: () => void;
    onSubmit: (extraPayload: {
        description: string;
        amount: number;
        reason?: string;
    }) => Promise<void>;
}

export const ChangeOrderModal: React.FC<ChangeOrderModalProps> = ({
    isOpen,
    jobId,
    organizationId,
    estimateId,
    previousContractPrice = 12500,
    onClose,
    onSubmit
}) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [reason, setReason] = useState("");
    const [amount, setAmount] = useState("");
    const [scheduleImpact, setScheduleImpact] = useState("0 days");
    const [mediaPreviews, setMediaPreviews] = useState<{ url: string; type: 'image' | 'video'; name: string }[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    const extraAmount = parseFloat(amount) || 0;
    const revisedContractPrice = previousContractPrice + extraAmount;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newPreviews: { url: string; type: 'image' | 'video'; name: string }[] = [];
        Array.from(files).forEach(file => {
            const isVideo = file.type.startsWith("video/");
            const isImage = file.type.startsWith("image/");
            if (!isImage && !isVideo) return;

            if (file.size > 25 * 1024 * 1024) {
                alert(`File ${file.name} exceeds 25MB size limit.`);
                return;
            }

            const url = URL.createObjectURL(file);
            newPreviews.push({
                url,
                type: isVideo ? 'video' : 'image',
                name: file.name
            });
        });

        setMediaPreviews(prev => [...prev, ...newPreviews]);
    };

    const handleRemoveMedia = (index: number) => {
        setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!description.trim()) {
            setErrorMsg("Detailed Description is required.");
            return;
        }
        if (extraAmount <= 0) {
            setErrorMsg("Change Order Amount must be greater than $0.");
            return;
        }

        setIsSaving(true);
        try {
            // Write using ONLY physical DB columns (description, amount, reason)
            const combinedDescription = title ? `${title}: ${description}` : description;
            const fullReason = reason ? `${reason} (Schedule Impact: ${scheduleImpact})` : `Schedule Impact: ${scheduleImpact}`;

            await onSubmit({
                description: combinedDescription,
                amount: extraAmount,
                reason: fullReason
            });

            onClose();
        } catch (err: any) {
            setErrorMsg(err?.message || "Failed to create Change Order.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 my-8">
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-purple-600" />
                            Create Service Extra / Change Order
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Linked to Job ID: #{jobId.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 rounded-full">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {errorMsg && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-sm mb-6">
                        <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handleFormSubmit} className="space-y-6">
                    {/* Price Breakdown Banner */}
                    <div className="grid grid-cols-3 gap-3 p-4 bg-purple-50/70 border border-purple-100 rounded-2xl text-center">
                        <div>
                            <span className="text-[10px] font-bold text-purple-700/60 uppercase">Previous Total</span>
                            <p className="text-base font-bold text-gray-900">${previousContractPrice.toLocaleString()}</p>
                        </div>
                        <div className="border-x border-purple-200/60">
                            <span className="text-[10px] font-bold text-purple-700/60 uppercase">Extra Added</span>
                            <p className="text-base font-bold text-purple-700">+${extraAmount.toLocaleString()}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-purple-700/60 uppercase">Revised Total</span>
                            <p className="text-base font-black text-blue-900">${revisedContractPrice.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">Extra Title</label>
                            <input
                                type="text"
                                placeholder="e.g. Replace Damaged Wall Framing"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-700">Added Cost ($) *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        required
                                        className="w-full h-10 pl-8 pr-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-700">Schedule Impact</label>
                                <input
                                    type="text"
                                    placeholder="e.g. +2 business days"
                                    value={scheduleImpact}
                                    onChange={(e) => setScheduleImpact(e.target.value)}
                                    className="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">Detailed Description *</label>
                            <textarea
                                rows={3}
                                placeholder="Explain scope of work for this extra..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500 resize-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-700">Reason for Change</label>
                            <input
                                type="text"
                                placeholder="e.g. Discovered rotted framing behind existing drywall during demo"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full h-10 px-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500/10 focus:border-purple-500"
                            />
                        </div>
                    </div>

                    {/* Media Attachments Preview UI */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                <Upload className="h-3.5 w-3.5 text-purple-600" />
                                Attach Evidence (Photos / Short Video)
                            </label>
                            <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-purple-600 font-bold hover:underline">
                                <Plus className="h-3.5 w-3.5" /> Select Media
                                <input
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        {mediaPreviews.length > 0 ? (
                            <div className="grid grid-cols-4 gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200">
                                {mediaPreviews.map((item, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 bg-black group">
                                        {item.type === 'video' ? (
                                            <video src={item.url} className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMedia(idx)}
                                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-80 hover:opacity-100"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                        <span className="absolute bottom-1 left-1 text-[9px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded uppercase">
                                            {item.type}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 border-2 border-dashed border-gray-200 rounded-2xl text-center text-xs text-gray-400 italic">
                                Attach photos (JPG, PNG, WEBP) or short video (MP4/MOV max 60s) to show customer why this extra is necessary.
                            </div>
                        )}
                        <p className="text-[10px] text-gray-400 italic">
                            ℹ️ Media UI Preview Mode (Storage bucket persistence deferred to Phase 10.7B).
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-11 px-6">
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-11 px-8 font-bold shadow-lg shadow-purple-600/20"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                            Create Change Order
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChangeOrderModal;
