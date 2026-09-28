import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: 'super_admin' | 'owner' | 'admin' | 'worker' | 'staff';
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  provider?: string;
  organization?: Organization;
  organizations?: Organization[];
  completedJobId?: string; // Mock field for review eligibility
}

interface UserContextType {
  user: UserSession | null;
  isLoading: boolean;
  login: (userData: UserSession) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  switchOrganization: (orgId: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = "ha_construction_user_session";

export const DEFAULT_ORG_ID = process.env.NEXT_PUBLIC_DEFAULT_ORG_ID || "45689bbf-193b-4ae8-82f4-e32bbe63b6dd";

export const DEFAULT_ORGANIZATION: Organization = {
  id: DEFAULT_ORG_ID,
  name: "H&A Construction LLC",
  slug: "ha-construction",
  role: "owner"
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserOrganizations = async (userId: string): Promise<Organization[]> => {
    if (!supabase) return [];

    try {
      const queryPromise = supabase
        .from('organization_users')
        .select(`
          role,
          organization:organizations (
            id,
            name,
            slug
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("Org query timeout") }), 2500)
      );

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

      if (error || !data) {
        if (error?.message !== "Org query timeout") {
          console.error("Error fetching organizations:", error);
        }
        return [];
      }

      return data
        .filter((item: any) => item.organization) // Defensive check
        .map((item: any) => ({
          id: item.organization.id,
          name: item.organization.name,
          slug: item.organization.slug,
          role: item.role
        }));
    } catch (e) {
      console.error("Critical error in fetchUserOrganizations:", e);
      return [];
    }
  };

  const mapSupabaseUser = async (authUser: User): Promise<UserSession> => {
    const orgs = await fetchUserOrganizations(authUser.id);
    const finalOrgs = orgs.length > 0 ? orgs : [DEFAULT_ORGANIZATION];
    return {
      id: authUser.id,
      name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email || "User",
      email: authUser.email || "",
      avatarUrl: authUser.user_metadata?.avatar_url,
      provider: "google",
      organizations: finalOrgs,
      organization: finalOrgs[0]
    };
  };

  useEffect(() => {
    // Safety timeout: ensure loading state clears even if Supabase hangs
    const timeoutId = setTimeout(() => {
      console.warn("Auth initialization safety timer expired. Forcing isLoading = false.");
      setIsLoading(false);
    }, 4000);

    if (isSupabaseConfigured && supabase) {
      let isMounted = true;
      let initialCheckDone = false;

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        initialCheckDone = true;

        // Execute asynchronously outside the Supabase Auth lock stack
        setTimeout(async () => {
          if (!isMounted) return;
          try {
            if (session?.user) {
              const mappedUser = await mapSupabaseUser(session.user);
              if (isMounted) setUser(mappedUser);
              localStorage.removeItem(USER_STORAGE_KEY);
            } else {
              const stored = localStorage.getItem(USER_STORAGE_KEY);
              if (stored && isMounted) {
                setUser(JSON.parse(stored));
              } else if (isMounted) {
                setUser(null);
              }
            }
          } catch (error) {
            console.error("Auth state change error:", error);
            if (isMounted) setUser(null);
          } finally {
            if (isMounted) {
              setIsLoading(false);
              clearTimeout(timeoutId);
            }
          }
        }, 0);
      });

      // Fallback if onAuthStateChange hasn't fired in 1 second
      setTimeout(() => {
        if (isMounted && !initialCheckDone) {
          supabase.auth.getSession().then(({ data }) => {
            if (!isMounted || initialCheckDone) return;
            setTimeout(async () => {
              if (!isMounted || initialCheckDone) return;
              try {
                if (data.session?.user) {
                  const mappedUser = await mapSupabaseUser(data.session.user);
                  if (isMounted) setUser(mappedUser);
                }
              } catch (err) {
                console.error("Auth fallback check error:", err);
              } finally {
                if (isMounted) {
                  setIsLoading(false);
                  clearTimeout(timeoutId);
                }
              }
            }, 0);
          });
        }
      }, 1000);

      return () => {
        isMounted = false;
        subscription.unsubscribe();
        clearTimeout(timeoutId);
      };
    } else {
      try {
        const stored = localStorage.getItem(USER_STORAGE_KEY);
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
        clearTimeout(timeoutId);
      }
    }
  }, []);

  const login = useCallback(async (userData: UserSession) => {
    setUser(userData);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const switchOrganization = useCallback((orgId: string) => {
    setUser(prevUser => {
      if (!prevUser || !prevUser.organizations) return prevUser;
      const org = prevUser.organizations.find(o => o.id === orgId);
      if (org) {
        return { ...prevUser, organization: org };
      }
      return prevUser;
    });
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
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
  }, []);

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    signInWithGoogle,
    switchOrganization
  }), [user, isLoading, login, logout, signInWithGoogle, switchOrganization]);

  return (
    <UserContext.Provider value={contextValue}>
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

