import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Inbox, Settings, LogOut, BarChart3, Images, MapPin, FileText, Globe, Building2, Store, Receipt, DollarSign, Calculator, Link2, Bell, PieChart, CreditCard, Mail, Menu, X, Wrench } from "lucide-react";
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
  const [isMobileOpen, setIsMobileOpen] = useState(false);

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

  // Primary internal operations nav items
  const primaryNavItems = useMemo(
    () => [
      { label: t("admin.dashboard"), icon: LayoutDashboard, path: "/admin" },
      { label: "Leads", icon: Inbox, path: "/admin/inbox" },
      { label: t("admin.estimates"), icon: FileText, path: "/admin/estimates" },
      { label: "Client Receipts", icon: Receipt, path: "/admin/client-receipts" },
      { label: "Receipts & Expenses", icon: FileText, path: "/admin/expenses" },
      { label: "Reimbursements", icon: DollarSign, path: "/admin/reimbursements" },
      { label: "Reports", icon: PieChart, path: "/admin/reports" },
      { label: "Tax Center", icon: Calculator, path: "/admin/tax-center" },
      { label: "Notifications", icon: Bell, path: "/admin/notifications", badge: unreadCount },
      { label: "Estimate Assistant", icon: FileText, path: "/admin/estimate-assistant" },
    ],
    [t, unreadCount]
  );

  // Secondary SaaS & Configuration items
  const secondaryNavItems = useMemo(
    () => [
      { label: "Billing & Credits", icon: CreditCard, path: "/admin/billing" },
      { label: "Communications", icon: Mail, path: "/admin/communications" },
      { label: t("nav.portfolio"), icon: Images, path: "/admin/portfolio" },
      { label: "Client Link", icon: Link2, path: "/admin/client-link" },
      { label: t("admin.reviews"), icon: BarChart3, path: "/admin/reviews" },
      { label: t("admin.analytics"), icon: BarChart3, path: "/admin/analytics" },
      { label: t("admin.locations"), icon: MapPin, path: "/admin/locations" },
      { label: "Services", icon: Store, path: "/admin/services" },
      { label: "Lead Settings", icon: Settings, path: "/admin/lead-settings" },
      { label: "Lead Market", icon: Store, path: "/admin/lead-market" },
      { label: t("admin.company"), icon: Building2, path: "/admin/company" },
      { label: t("admin.settings"), icon: Settings, path: "/admin/settings" },
    ],
    [t]
  );

  const filteredPrimary = useMemo(() => {
    if (userRole === "worker") {
      return primaryNavItems.filter(item => item.path === "/admin");
    }
    return primaryNavItems;
  }, [primaryNavItems, userRole]);

  const filteredSecondary = useMemo(() => {
    if (userRole === "worker") {
      return [];
    }
    return secondaryNavItems;
  }, [secondaryNavItems, userRole]);

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
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: "#f4f6f9" }}>
      {/* Mobile Header Bar */}
      <header className="md:hidden bg-[#0b2a4a] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-400" />
          <span className="font-bold text-base tracking-tight">H-A Construction</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 text-white hover:bg-white/10 rounded-lg focus:outline-none"
          aria-label="Toggle menu"
        >
          {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar / Mobile Drawer */}
      <aside
        className={`w-64 bg-[#0b2a4a] flex flex-col shrink-0 fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <Link to="/" className="text-lg font-bold text-white tracking-tight">H-A Construction</Link>
            <p className="text-xs text-white/60 mt-0.5">Internal Operations</p>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="md:hidden text-white/70 hover:text-white p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          <Link
            to="/"
            onClick={() => setIsMobileOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 mb-3 border-b border-white/10 pb-3"
          >
            <Globe className="h-4 w-4" strokeWidth={1.5} />
            {t("nav.back_to_site")}
          </Link>

          <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1 pt-1">Daily Operations</p>

          {filteredPrimary.map((item) => {
            const active = isNavActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  active
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "text-white/75 hover:text-white hover:bg-white/10"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{item.label}</span>
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

          {filteredSecondary.length > 0 && (
            <>
              <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-white/40 mt-4 mb-1 pt-2 border-t border-white/10">System & Admin</p>
              {filteredSecondary.map((item) => {
                const active = isNavActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                      active
                        ? "bg-blue-600 text-white font-semibold shadow-sm"
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;

