import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Estimate, EstimateStatus } from "@/lib/estimates";
import { useLanguage } from "@/context/LanguageContext";

interface EstimateFormProps {
    formData: Partial<Estimate>;
    onChange: (updates: Partial<Estimate>) => void;
}

const EstimateForm = ({ formData, onChange }: EstimateFormProps) => {
    const { t } = useLanguage();

    const projectTypes = [
        "Kitchen Remodel",
        "Bathroom Remodel",
        "Deck Build",
        "Framing",
        "Trim Work",
        "Custom Carpentry",
        "Roofing Repair",
        "Siding",
        "General Repair"
    ];

    const statuses: EstimateStatus[] = [
        'Draft',
        'Sent',
        'Viewed',
        'Approved',
        'Rejected',
        'Expired',
        'Paid',
        'Partially_Paid'
    ];
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="client_name">Client Name *</Label>
                    <Input
                        id="client_name"
                        placeholder="e.g. John Doe"
                        value={formData.client_name || ""}
                        onChange={(e) => onChange({ client_name: e.target.value })}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="client_email">Client Email</Label>
                    <Input
                        id="client_email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.client_email || ""}
                        onChange={(e) => onChange({ client_email: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="client_phone">Client Phone</Label>
                    <Input
                        id="client_phone"
                        placeholder="(555) 000-0000"
                        value={formData.client_phone || ""}
                        onChange={(e) => onChange({ client_phone: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="project_type">{t("estimate.project.type")}</Label>
                    <select
                        id="project_type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.project_type || ""}
                        onChange={(e) => onChange({ project_type: e.target.value })}
                    >
                        <option value="">Select Project Type</option>
                        {projectTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="valid_until">Valid Until</Label>
                    <Input
                        id="valid_until"
                        type="date"
                        value={formData.valid_until ? formData.valid_until.split('T')[0] : ""}
                        onChange={(e) => onChange({ valid_until: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                        id="status"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.status || "Draft"}
                        onChange={(e) => onChange({ status: e.target.value as any })}
                    >
                        {statuses.map(s => (
                            <option key={s} value={s}>{t(`admin.status.${s.toLowerCase()}`)}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                    id="notes"
                    placeholder="Private notes for your team..."
                    value={formData.notes || ""}
                    onChange={(e) => onChange({ notes: e.target.value })}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                    id="terms"
                    placeholder="Payment terms, warranty, etc."
                    className="min-h-[100px]"
                    value={formData.terms || ""}
                    onChange={(e) => onChange({ terms: e.target.value })}
                />
            </div>
        </div>
    );
};

export default EstimateForm;
