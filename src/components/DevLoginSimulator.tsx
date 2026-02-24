import { useState } from "react";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const DevLoginSimulator = () => {
  const { user, login, logout } = useUser();
  const [isOpen, setIsOpen] = useState(false);

  if (typeof window === "undefined" || process.env.NODE_ENV !== "development") {
    return null;
  }

  const handleSimulateLogin = (withJob: boolean = false) => {
    const fakeUser = {
      id: `user_${Date.now()}`,
      name: "João Silva",
      email: "joao@example.com",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=JoaoSilva",
      provider: "google",
      completedJobId: withJob ? `job_${Date.now()}` : undefined,
    };
    login(fakeUser);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {user ? (
        <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-4 w-64">
          <p className="text-xs text-slate-600 mb-2">DEV: Logged in as</p>
          <p className="font-semibold text-slate-900 mb-3">{user.name}</p>
          <Button
            onClick={logout}
            size="sm"
            variant="outline"
            className="w-full flex items-center justify-center gap-2"
          >
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      ) : (
        <div>
          {!isOpen && (
            <Button
              onClick={() => setIsOpen(true)}
              size="sm"
              className="bg-slate-900 text-white text-xs"
            >
              DEV: Login
            </Button>
          )}
          {isOpen && (
            <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-4 w-72">
              <p className="text-xs text-slate-600 mb-3 font-semibold">DEV: Simulate Login</p>
              <div className="space-y-2">
                <Button
                  onClick={() => handleSimulateLogin(true)}
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                >
                  ✅ Login with Completed Job
                </Button>
                <Button
                  onClick={() => handleSimulateLogin(false)}
                  size="sm"
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs"
                >
                  ⚠️ Login without Completed Job
                </Button>
                <Button
                  onClick={() => setIsOpen(false)}
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DevLoginSimulator;
