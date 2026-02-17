import { ADMIN_DISPLAY_EMAIL } from "@/lib/admin-auth";

const AdminSettings = () => (
  <div className="p-6 max-w-2xl mx-auto">
    <h1 className="text-2xl font-bold mb-6">Settings</h1>

    <div className="bg-card rounded-xl border border-border p-6 mb-6">
      <h3 className="font-semibold text-sm mb-4">Owner Account</h3>
      <div className="text-sm">
        <span className="text-muted-foreground">Email:</span>{" "}
        <strong>{ADMIN_DISPLAY_EMAIL}</strong>
      </div>
    </div>

    <div className="bg-card rounded-xl border border-border p-6 mb-6">
      <h3 className="font-semibold text-sm mb-4">Notifications</h3>
      <div className="space-y-3 text-sm">
        <label className="flex items-center gap-3">
          <input type="checkbox" defaultChecked className="rounded" />
          <span>Email notifications for new leads</span>
        </label>
      </div>
    </div>

    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-semibold text-sm mb-4">Webhook (CRM Integration)</h3>
      <p className="text-xs text-muted-foreground mb-3">
        Forward new leads to an external CRM by providing a webhook URL.
      </p>
      <input
        type="url"
        placeholder="https://your-crm.com/webhook"
        className="w-full px-3 py-2 border border-border rounded-lg text-sm"
      />
      <p className="text-xs text-muted-foreground mt-2">
        Enable Lovable Cloud for real-time webhook delivery.
      </p>
    </div>
  </div>
);

export default AdminSettings;
