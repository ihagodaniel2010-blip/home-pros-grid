import { ADMIN_DISPLAY_EMAIL } from "@/lib/admin-auth";

const AdminSettings = () => (
  <div className="p-8 max-w-2xl mx-auto">
    <h1 className="text-2xl font-bold mb-8 tracking-tight">Settings</h1>

    <div className="bg-card rounded-2xl border border-border/50 p-7 mb-6">
      <h3 className="font-semibold text-sm mb-4">Owner Account</h3>
      <div className="flex justify-between text-sm py-2 border-b border-border/30">
        <span className="text-muted-foreground">Email</span>
        <span className="font-medium">{ADMIN_DISPLAY_EMAIL}</span>
      </div>
    </div>

    <div className="bg-card rounded-2xl border border-border/50 p-7 mb-6">
      <h3 className="font-semibold text-sm mb-4">Notifications</h3>
      <label className="flex items-center gap-3 text-sm cursor-pointer">
        <input type="checkbox" defaultChecked className="rounded border-border" />
        <span>Email notifications for new leads</span>
      </label>
    </div>

    <div className="bg-card rounded-2xl border border-border/50 p-7">
      <h3 className="font-semibold text-sm mb-4">Webhook (CRM Integration)</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Forward new leads to an external CRM by providing a webhook URL.
      </p>
      <input
        type="url"
        placeholder="https://your-crm.com/webhook"
        className="w-full px-4 py-3 bg-accent/30 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
      />
      <p className="text-xs text-muted-foreground mt-3">
        Enable Lovable Cloud for real-time webhook delivery.
      </p>
    </div>
  </div>
);

export default AdminSettings;
