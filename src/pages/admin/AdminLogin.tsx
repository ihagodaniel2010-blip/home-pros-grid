import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "@/lib/admin-auth";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminLogin(email, password)) {
      navigate("/admin");
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 navy-gradient-hero">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="glass-card-strong p-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Lock className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-xl font-bold text-center mb-8 tracking-tight">Admin Login</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="floating-input">
              <input type="email" placeholder=" " value={email} onChange={(e) => setEmail(e.target.value)} className="!rounded-xl" />
              <label>Email</label>
            </div>
            <div className="floating-input">
              <input type="password" placeholder=" " value={password} onChange={(e) => setPassword(e.target.value)} className="!rounded-xl" />
              <label>Password</label>
            </div>
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <button type="submit" className="w-full py-3.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all duration-200 hover:shadow-lg">
              Sign In
            </button>
          </form>
          <p className="text-[11px] text-muted-foreground text-center mt-5">
            Demo: admin@networx.com / admin123
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
