import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TotalsSummaryProps {
    subtotal: number;
    tax_amount: number;
    discount_amount: number;
    total_amount: number;
    onTaxChange: (val: number) => void;
    onDiscountChange: (val: number) => void;
}

const TotalsSummary = ({
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    onTaxChange,
    onDiscountChange
}: TotalsSummaryProps) => {
    return (
        <div className="flex justify-end p-6 bg-gray-50/50">
            <div className="w-full max-w-xs space-y-3">
                <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between items-center gap-4">
                    <Label htmlFor="tax" className="text-sm text-gray-600 shrink-0">Tax</Label>
                    <div className="flex items-center gap-1.5 w-32 shrink-0">
                        <span className="text-gray-400 text-sm">$</span>
                        <Input
                            id="tax"
                            type="number"
                            min="0"
                            step="0.01"
                            className="h-8 text-right font-medium"
                            value={tax_amount}
                            onChange={(e) => onTaxChange(parseFloat(e.target.value) || 0)}
                        />
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
