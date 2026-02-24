import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/context/UserContext";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

const Login = () => {
  const navigate = useNavigate();
  const { user, login, signInWithGoogle } = useUser();
  const { toast } = useToast();

  // If already logged in, redirect to experiences
  if (user) {
    navigate("/experiences");
  }

  const handleGoogleLogin = async () => {
    if (isSupabaseConfigured) {
      try {
        await signInWithGoogle();
        return;
      } catch (error) {
        toast({
          title: "Google Login Error",
          description: error instanceof Error ? error.message : "Failed to start Google sign-in.",
          duration: 4000,
        });
        return;
      }
    }

    toast({
      title: "Supabase not configured",
      description: "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real Google login.",
      duration: 3000,
    });

    // For now, simulate Google login in development
    if (import.meta.env.DEV) {
      await login({
        id: `google-${Date.now()}`,
        name: "Test User",
        email: "test@example.com",
        provider: "google",
        avatarUrl: undefined,
      });
      navigate("/experiences");
    }
  };

  return (
    <Layout>
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-gray-200 shadow-lg">
          <CardHeader className="space-y-3 text-center pb-8 pt-8">
            <CardTitle className="text-3xl font-bold tracking-tight">
              Sign in to Barrigudo
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              Use your Google account to leave a review and track your requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <Button
              onClick={handleGoogleLogin}
              variant="outline"
              size="lg"
              className="w-full h-14 text-base font-medium border-2 hover:border-gray-400 hover:bg-gray-50 transition-all"
            >
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-600 leading-relaxed">
                We only use your profile photo and name for your review. Your email is kept private.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Login;
