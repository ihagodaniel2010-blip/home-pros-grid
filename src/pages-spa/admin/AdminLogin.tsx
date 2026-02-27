import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchAdminSession, adminLogin } from "@/lib/admin-auth";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
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
            {error && <p className="text-red-600 text-sm font-medium">{error}</p>}
            <button
              type="submit"
              disabled={checkingSession}
              className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg active:scale-[0.99]"
            >
              {checkingSession ? "Checking..." : "Sign In"}
            </button>
          </form>
          <p className="text-[11px] text-gray-500 text-center mt-6 leading-relaxed">
            Access is enabled by one-click login.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
