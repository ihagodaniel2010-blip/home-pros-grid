import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface UserSession {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider?: string;
  completedJobId?: string; // Mock field for review eligibility
}

interface UserContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (userData: UserSession) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = "barrigudo_user_session";

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mapSupabaseUser = (authUser: User): UserSession => ({
    id: authUser.id,
    name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email || "User",
    email: authUser.email || "",
    avatarUrl: authUser.user_metadata?.avatar_url,
    provider: "google",
  });

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      let isMounted = true;

      supabase.auth.getSession().then(({ data }) => {
        if (!isMounted) return;
        if (data.session?.user) {
          setUser(mapSupabaseUser(data.session.user));
        } else {
          // Check for manual dev session if no supabase session
          const stored = localStorage.getItem(USER_STORAGE_KEY);
          if (stored) {
            setUser(JSON.parse(stored));
          } else {
            setUser(null);
          }
        }
        setIsLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(mapSupabaseUser(session.user));
          localStorage.removeItem(USER_STORAGE_KEY); // Real session takes precedence
        } else {
          // If logged out from Supabase, also clear local session
          setUser(null);
          localStorage.removeItem(USER_STORAGE_KEY);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } else {
      // Fallback for when Supabase is not configured
      try {
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const login = async (userData: UserSession) => {
    setUser(userData);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/experiences`,
      },
    });

    if (error) {
      throw error;
    }
  };

  return (
    <UserContext.Provider value={{ user, isLoading, login, logout, signInWithGoogle }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};
