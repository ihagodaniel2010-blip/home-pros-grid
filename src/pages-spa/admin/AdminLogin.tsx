import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAdminSession, adminLogin } from "@/lib/admin-auth";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [devEmail, setDevEmail] = useState("");
  const [devPassword, setDevPassword] = useState("");

  useEffect(() => {
    let active = true;

    // Timeout for session check
    const timeoutId = setTimeout(() => {
      if (active && checkingSession) {
        console.warn("Admin session check timed out.");
        setCheckingSession(false);
      }
    }, 4000);

    fetchAdminSession()
      .then((session) => {
        if (!active) return;
        if (session?.email) {
          navigate("/admin", { replace: true });
          return;
        }
        setCheckingSession(false);
        clearTimeout(timeoutId);
      })
      .catch((err) => {
        console.error("Admin session check error:", err);
        if (!active) return;
        setCheckingSession(false);
        clearTimeout(timeoutId);
      });

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCheckingSession(true);

    try {
      const loginResult = await adminLogin();
      if (!loginResult.ok) {
        setError(loginResult.error || "Login failed");
        setCheckingSession(false);
      }
      // If ok, the browser will redirect via OAuth
    } catch (err) {
      setError("An unexpected error occurred during login.");
      setCheckingSession(false);
    }
  };

  const handleDevSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCheckingSession(true);

    if (!supabase) {
      setError("Supabase is not configured.");
      setCheckingSession(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: devEmail,
        password: devPassword,
      });

      if (signInError) {
        setError(signInError.message);
        setCheckingSession(false);
        return;
      }

      if (data?.session) {
        const session = await fetchAdminSession();
        if (session?.email) {
          navigate("/admin", { replace: true });
        } else {
          navigate("/admin", { replace: true });
        }
      } else {
        setError("Sign in succeeded, but no session returned.");
        setCheckingSession(false);
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred during dev login.");
      setCheckingSession(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "linear-gradient(160deg, #0b2a4a 0%, #081a2f 100%)" }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-lg">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-6">
            <Lock className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Admin Login</h1>
          <p className="text-center text-sm text-gray-600 mb-8">Click to access the admin panel</p>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <p className="text-red-600 text-sm font-medium mb-2">{error}</p>}
            <button
              type="submit"
              disabled={checkingSession}
              className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg active:scale-[0.99]"
            >
              {checkingSession ? "Checking..." : "Sign In with Google"}
            </button>
          </form>
          <p className="text-[11px] text-gray-500 text-center mt-6 leading-relaxed">
            Access is enabled by Google login.
          </p>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="text-center mb-4">
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Development Mode
                </span>
                <p className="text-xs text-gray-500 mt-1 font-medium">Sign in with email/password</p>
              </div>
              <form onSubmit={handleDevSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="dev-email">
                    Email Address
                  </label>
                  <input
                    id="dev-email"
                    type="email"
                    required
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    placeholder="owner-a@h-a-construction.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1" htmlFor="dev-password">
                    Password
                  </label>
                  <input
                    id="dev-password"
                    type="password"
                    required
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={checkingSession}
                  className="w-full py-2.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-all duration-200 hover:shadow-md active:scale-[0.99] disabled:opacity-50"
                >
                  {checkingSession ? "Authenticating..." : "Login via Email"}
                </button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
