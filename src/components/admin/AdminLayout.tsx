import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Inbox, Settings, LogOut, BarChart3, Images, MapPin, FileText, Globe, Building2, Store, Receipt, DollarSign, Calculator, Link2, Bell, PieChart } from "lucide-react";
import { adminLogout, fetchAdminSession } from "@/lib/admin-auth";
import { getLeads } from "@/lib/leads";
import { useNotifications } from "@/lib/notifications";
import { useLanguage } from "@/context/LanguageContext";
import { useUser } from "@/context/UserContext";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useUser();
  const { unreadCount, loadNotifications } = useNotifications();
  const [newLeads, setNewLeads] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  const userRole = user?.organization?.role;

  useEffect(() => {
    getLeads().then(leads => {
      setNewLeads(leads.filter(l => l.status === "New").length);
    });
  }, [location.pathname]); // Update badge when path changes

  useEffect(() => {
    if (isAuthed && user?.organization?.id) {
      loadNotifications(user.organization.id);
    }
  }, [isAuthed, user, loadNotifications]);

  const navItems = useMemo(
    () => [
      { label: t("admin.dashboard"), icon: LayoutDashboard, path: "/admin" },
      { label: "Reports", icon: PieChart, path: "/admin/reports" },
      { label: "Notifications", icon: Bell, path: "/admin/notifications", badge: unreadCount },
      { label: t("nav.portfolio"), icon: Images, path: "/admin/portfolio" },
      { label: "Leads", icon: Inbox, path: "/admin/inbox" },
      { label: "Lead Market", icon: Store, path: "/admin/lead-market" },
      { label: "Estimate Assistant", icon: FileText, path: "/admin/estimate-assistant" },
      { label: t("admin.estimates"), icon: FileText, path: "/admin/estimates" },
      { label: "Client Receipts", icon: Receipt, path: "/admin/client-receipts" },
      { label: "Receipts & Expenses", icon: FileText, path: "/admin/expenses" },
      { label: "Reimbursements", icon: DollarSign, path: "/admin/reimbursements" },
      { label: "Tax Center", icon: Calculator, path: "/admin/tax-center" },
      { label: "Client Link", icon: Link2, path: "/admin/client-link" },
      { label: t("admin.reviews"), icon: BarChart3, path: "/admin/reviews" },
      { label: t("admin.analytics"), icon: BarChart3, path: "/admin/analytics" },
      { label: t("admin.locations"), icon: MapPin, path: "/admin/locations" },
      { label: "Services", icon: Store, path: "/admin/services" },
      { label: "Lead Settings", icon: Settings, path: "/admin/lead-settings" },
      { label: t("admin.company"), icon: Building2, path: "/admin/company" },
      { label: t("admin.settings"), icon: Settings, path: "/admin/settings" },
    ],
    [t, unreadCount]
  );

  const filteredNavItems = useMemo(() => {
    if (userRole === "worker") {
      // Workers only see Dashboard (WorkerDashboard).
      // Inbox/Leads redirects them back to /admin anyway.
      return navItems.filter(item => item.path === "/admin");
    }
    return navItems;
  }, [navItems, userRole]);

  const isNavActive = (path: string) => {
    if (path.includes("?")) {
      return `${location.pathname}${location.search}` === path;
    }
    if (path === "/admin/settings") {
      return location.pathname === path && !location.search;
    }
    return location.pathname === path;
  };

  useEffect(() => {
    let active = true;
    fetchAdminSession()
      .then((session) => {
        if (!active) return;
        if (!session) {
          setIsAuthed(false);
          navigate("/admin/login");
          return;
        }
        setIsAuthed(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  // Restrict direct URL access for worker
  useEffect(() => {
    if (isAuthed && userRole === "worker") {
      const allowedPaths = ["/admin", "/admin/inbox"];
      const currentPath = location.pathname;
      if (!allowedPaths.includes(currentPath)) {
        console.warn(`Access denied to ${currentPath} for role worker`);
        navigate("/admin", { replace: true });
      }
    }
  }, [isAuthed, userRole, location.pathname, navigate]);

  if (isLoading) return null;
  if (!isAuthed) return null;

  return (
    <div className="min-h-screen flex" style={{ background: "#f4f6f9" }}>
      {/* Sidebar */}
      <aside className="w-64 bg-[#0b2a4a] flex flex-col shrink-0">
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="text-lg font-bold text-white tracking-tight">Barrigudo</Link>
          <p className="text-xs text-white/60 mt-0.5">Admin Panel</p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 mb-4 border-b border-white/10 pb-4"
          >
            <Globe className="h-4 w-4" strokeWidth={1.5} />
            {t("nav.back_to_site")}
          </Link>
          {filteredNavItems.map((item) => {
            const active = isNavActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 ${active
                  ? "bg-white/15 text-white font-medium"
                  : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
              >
                <item.icon className="h-4 w-4" strokeWidth={1.5} />
                {item.label}
                {item.label === "Leads" && newLeads > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {newLeads}
                  </span>
                )}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/10">
          <button
            onClick={async () => {
              await adminLogout();
              navigate("/");
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 w-full transition-all duration-200"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} /> {t("nav.sign_out")}
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
