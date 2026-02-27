import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/context/LanguageContext";
import { createPayment } from "@/lib/estimates";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface RegisterPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    estimateId: string;
    organizationId: string;
    remainingBalance: number;
    onSuccess: () => void;
}

const RegisterPaymentModal = ({
    isOpen,
    onClose,
    estimateId,
    organizationId,
    remainingBalance,
    onSuccess
}: RegisterPaymentModalProps) => {
    const { t } = useLanguage();
    const [amount, setAmount] = useState(remainingBalance.toString());
    const [method, setMethod] = useState("bank_transfer");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount.");
            return;
        }

        setIsSaving(true);
        try {
            const success = await createPayment({
                estimate_id: estimateId,
                organization_id: organizationId,
                amount: parseFloat(amount),
                payment_method: method,
                payment_date: new Date(date).toISOString(),
            });

            if (success) {
                toast.success("Payment registered successfully.");
                onSuccess();
                onClose();
            } else {
                toast.error("Failed to register payment.");
            }
        } catch (error) {
            console.error("Payment error:", error);
            toast.error("An error occurred.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("admin.payment.register")}</DialogTitle>
                    <DialogDescription>
                        Enter the payment details for this estimate. Remaining balance: ${remainingBalance.toFixed(2)}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="amount">{t("admin.payment.amount")}</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="method">{t("admin.payment.method")}</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="check">Check</SelectItem>
                                <SelectItem value="card">Credit Card</SelectItem>
                                <SelectItem value="bank_transfer">Bank Transfer / Zelle / PIX</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="date">{t("admin.payment.date")}</Label>
                        <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RegisterPaymentModal;
