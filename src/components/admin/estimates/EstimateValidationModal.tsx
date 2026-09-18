import React from "react";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EstimateValidationModalProps {
    isOpen: boolean;
    title?: string;
    message: string;
    targetElementId?: string;
    onClose: () => void;
}

export const highlightAndFocusElement = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
            el.focus();
            el.classList.add("ring-2", "ring-red-500", "ring-offset-2", "bg-red-50/50");
            setTimeout(() => {
                el.classList.remove("ring-2", "ring-red-500", "ring-offset-2", "bg-red-50/50");
            }, 3000);
        }, 300);
    }
};

const EstimateValidationModal: React.FC<EstimateValidationModalProps> = ({
    isOpen,
    title = "Validation Required",
    message,
    targetElementId,
    onClose
}) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onClose();
        if (targetElementId) {
            highlightAndFocusElement(targetElementId);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 transform transition-all scale-100">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                        <p className="text-xs text-gray-500">Please complete all required fields before saving.</p>
                    </div>
                </div>

                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 mb-6 text-sm font-medium text-amber-900 leading-relaxed">
                    {message}
                </div>

                <div className="flex justify-end">
                    <Button
                        onClick={handleConfirm}
                        className="bg-[#0b2a4a] hover:bg-[#081e35] text-white px-6 h-11 rounded-xl font-bold gap-2 shadow-lg shadow-blue-900/10"
                    >
                        <Check className="h-4 w-4" />
                        OK
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EstimateValidationModal;
