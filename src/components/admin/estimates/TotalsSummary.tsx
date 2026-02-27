import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TotalsSummaryProps {
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    onTaxRateChange: (val: number) => void;
    onDiscountChange: (val: number) => void;
    onRecalculate: () => void;
}

const TotalsSummary = ({
    subtotal,
    tax_rate,
    tax_amount,
    discount_amount,
    total_amount,
    onTaxRateChange,
    onDiscountChange,
    onRecalculate
}: TotalsSummaryProps) => {
    return (
        <div className="flex justify-end p-6 bg-gray-50/50">
            <div className="w-full max-w-xs space-y-3">
                <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center gap-4">
                    <div className="flex flex-col">
                        <Label htmlFor="tax" className="text-sm text-gray-600">Tax</Label>
                        <span className="text-[10px] text-gray-400 font-medium">${tax_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 w-32 shrink-0">
                        <Input
                            id="tax"
                            type="number"
                            min="0"
                            step="0.01"
                            max="100"
                            className="h-8 text-right font-medium"
                            value={tax_rate}
                            onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)}
                        />
                        <span className="text-gray-400 text-sm font-bold w-4">%</span>
                    </div>
                </div>

                <div className="flex justify-between items-center gap-4">
                    <Label htmlFor="discount" className="text-sm text-gray-600 shrink-0">Discount</Label>
                    <div className="flex items-center gap-1.5 w-32 shrink-0">
                        <span className="text-gray-400 text-sm">$</span>
                        <Input
                            id="discount"
                            type="number"
                            min="0"
                            step="0.01"
                            className="h-8 text-right font-medium text-red-600"
                            value={discount_amount}
                            onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        onClick={onRecalculate}
                        className="text-[10px] font-bold text-primary/60 hover:text-primary transition-colors flex items-center gap-1 uppercase tracking-wider"
                    >
                        Recalculate
                    </button>
                </div>

                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-base font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-blue-600">
                        ${total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default TotalsSummary;
