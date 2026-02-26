import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Inbox, Settings, LogOut, BarChart3, Images, MapPin } from "lucide-react";
import { adminLogout, fetchAdminSession } from "@/lib/admin-auth";
import { getLeads } from "@/lib/leads";

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [newLeads, setNewLeads] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    getLeads().then(leads => {
      setNewLeads(leads.filter(l => l.status === "New").length);
    });
  }, [location.pathname]); // Update badge when path changes

  const navItems = useMemo(
    () => [
      { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
      { label: "Portfolio", icon: Images, path: "/admin/portfolio" },
      { label: "Inbox", icon: Inbox, path: "/admin/inbox" },
      { label: "Reviews", icon: BarChart3, path: "/admin/reviews" },
      { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
      { label: "Locations", icon: MapPin, path: "/admin/settings?tab=maps" },
      { label: "Settings", icon: Settings, path: "/admin/settings" },
    ],
    []
  );

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
          navigate("/login");
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
          {navItems.map((item) => {
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
                {item.label === "Inbox" && newLeads > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {newLeads}
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
