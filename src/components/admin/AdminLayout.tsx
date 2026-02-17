import { useEffect } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Inbox, Settings, LogOut, BarChart3 } from "lucide-react";
import { isAdminLoggedIn, adminLogout } from "@/lib/admin-auth";
import { getLeads } from "@/lib/leads";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Inbox", icon: Inbox, path: "/admin/inbox" },
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
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 bg-sidebar text-sidebar-foreground flex flex-col shrink-0">
        <div className="p-5 border-b border-sidebar-border">
          <Link to="/" className="text-lg font-bold text-sidebar-primary-foreground">Networx</Link>
          <p className="text-xs text-sidebar-foreground/60 mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.label === "Inbox" && newLeads > 0 && (
                  <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {newLeads}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => { adminLogout(); navigate("/"); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 w-full transition-colors"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 bg-secondary overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
