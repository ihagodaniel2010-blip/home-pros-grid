import { useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Inbox, Settings, LogOut, BarChart3 } from "lucide-react";
import { isAdminLoggedIn, adminLogout } from "@/lib/admin-auth";
import { getLeads } from "@/lib/leads";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Inbox", icon: Inbox, path: "/admin/inbox" },
  { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
  { label: "Settings", icon: Settings, path: "/admin/settings" },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const newLeads = getLeads().filter((l) => l.status === "New").length;

  useEffect(() => {
    if (!isAdminLoggedIn()) navigate("/admin/login");
  }, [navigate]);

  if (!isAdminLoggedIn()) return null;

  return (
    <div className="dark min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card/50 backdrop-blur-xl border-r border-border/50 flex flex-col shrink-0">
        <div className="p-6 border-b border-border/50">
          <Link to="/" className="text-lg font-bold text-foreground tracking-tight">Networx</Link>
          <p className="text-xs text-muted-foreground mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.5} />
                {item.label}
                {item.label === "Inbox" && newLeads > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {newLeads}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border/50">
          <button
            onClick={() => { adminLogout(); navigate("/"); }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 w-full transition-all duration-200"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
