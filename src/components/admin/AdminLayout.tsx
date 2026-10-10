import { useEffect, useMemo, useState, Suspense } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Inbox, Settings, LogOut, BarChart3, Images, MapPin, FileText, Globe, Building2, Store, Receipt, DollarSign, Calculator, Link2, Bell, PieChart, CreditCard, Mail, Menu, X, Wrench, Loader2, ShieldAlert } from "lucide-react";
import ErrorBoundary from "./ErrorBoundary";
import { adminLogout, fetchAdminSession } from "@/lib/admin-auth";
import { isAdminAllowed } from "@/lib/admin-allowlist";
import { getLeads } from "@/lib/leads";
import { useNotifications } from "@/lib/notifications";
import { useLanguage } from "@/context/LanguageContext";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user, logout, isLoading: userLoading } = useUser();
  const { unreadCount, loadNotifications } = useNotifications();
  const [newLeads, setNewLeads] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const userRole = user?.organization?.role;
  const orgId = user?.organization?.id;

  useEffect(() => {
    let active = true;

    if (userLoading) return;

    if (user) {
      const allowed = isAdminAllowed(user.email);
      if (active) {
        setIsAuthed(true);
        setIsAuthorized(allowed);
        setIsLoading(false);
      }
      return;
    }

    fetchAdminSession()
      .then((session) => {
        if (!active) return;
        if (session?.email && isAdminAllowed(session.email)) {
          setIsAuthed(true);
          setIsAuthorized(true);
        } else if (session?.email) {
          setIsAuthed(true);
          setIsAuthorized(false);
        } else {
          setIsAuthed(false);
          setIsAuthorized(false);
          navigate("/admin/login", { replace: true });
        }
      })
      .catch((err) => {
        console.error("Auth check error in AdminLayout:", err);
        if (!active) return;
        setIsAuthed(false);
        setIsAuthorized(false);
        navigate("/admin/login", { replace: true });
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, userLoading, navigate]);

  useEffect(() => {
    if (!isAuthorized || userLoading || !orgId) return;
    let mounted = true;
    getLeads(orgId)
      .then(leads => {
        if (mounted) setNewLeads((leads || []).filter(l => l.status === "New").length);
      })
      .catch(err => {
        console.warn("[AdminLayout] Error fetching new leads badge:", err);
      });
    return () => {
      mounted = false;
    };
  }, [location.pathname, userLoading, orgId, isAuthorized]);

  useEffect(() => {
    if (isAuthed && isAuthorized && orgId) {
      loadNotifications(orgId);
    }
  }, [isAuthed, isAuthorized, orgId, loadNotifications]);

  // Restrict direct URL access for worker
  useEffect(() => {
    if (isAuthed && isAuthorized && userRole === "worker") {
      const allowedPaths = ["/admin", "/admin/inbox"];
      const currentPath = location.pathname;
      if (!allowedPaths.includes(currentPath)) {
        console.warn(`Access denied to ${currentPath} for role worker`);
        navigate("/admin", { replace: true });
      }
    }
  }, [isAuthed, isAuthorized, userRole, location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b2a4a]">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!isAuthed) return null;

  // Render Access Denied 403 screen without loading any protected data
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#081a2f] text-white">
        <div className="max-w-md w-full bg-white text-slate-900 border border-slate-200 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-100 border border-red-200 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <Badge variant="outline" className="mb-4 bg-red-50 text-red-700 border-red-200 font-bold px-3 py-1">
            HTTP 403 — Acesso Negado
          </Badge>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
            Acesso Não Autorizado
          </h1>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            A conta Google <strong className="text-slate-900">{user?.email || "conectada"}</strong> não possui permissões administrativas para gerenciar o portal da <strong>H &amp; A Construction LLC</strong>.
          </p>
          <div className="space-y-3">
            <Button
              onClick={async () => {
                await adminLogout();
                await logout();
                navigate("/admin/login", { replace: true });
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11 rounded-xl shadow-md transition-all"
            >
              Encerrar Sessão e Fazer Login
            </Button>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full border-slate-300 text-slate-700 hover:bg-slate-100 font-bold h-11 rounded-xl"
            >
              Voltar ao Site Público
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

          {/* Operations Group */}
          <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-blue-300/80 mb-1 pt-1">Operations</p>
          {filteredOperations.map((item) => {
            const active = isNavActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  active
                    ? "bg-blue-600 text-white font-semibold shadow-sm"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span className="truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          {/* Financial Group */}
          {filteredFinancial.length > 0 && (
            <>
              <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-emerald-400/80 mt-4 mb-1 pt-2 border-t border-white/10">Financial</p>
              {filteredFinancial.map((item) => {
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
                  </Link>
                );
              })}
            </>
          )}

          {/* Company & Site Group */}
          {filteredCompany.length > 0 && (
            <>
              <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-amber-300/80 mt-4 mb-1 pt-2 border-t border-white/10">Company &amp; Site</p>
              {filteredCompany.map((item) => {
                const active = isNavActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                      active
                        ? "bg-blue-600 text-white font-semibold shadow-sm"
                        : "text-white/70 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}

          {/* System & SaaS Group */}
          {filteredSystem.length > 0 && (
            <>
              <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4 mb-1 pt-2 border-t border-white/10">System &amp; SaaS</p>
              {filteredSystem.map((item) => {
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
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
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
        <ErrorBoundary>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <Loader2 className="h-8 w-8 animate-spin text-[#0b2a4a]" />
            </div>
          }>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default AdminLayout;

