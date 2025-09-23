import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import Dashboard from "@/components/dashboard/Dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Shield, Zap } from "lucide-react";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    let sessionChecked = false;

    // Get initial session with retry logic
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }

        if (!mounted) return;

        setUser(session?.user ?? null);
        sessionChecked = true;
        
        // If user is logged in, check if they have a username
        if (session?.user) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', session.user.id)
              .single();

            if (profileError) {
              console.error("Profile error:", profileError);
            } else if (!profile?.username) {
              navigate("/username-setup");
              return;
            }
          } catch (profileErr) {
            console.error("Profile check failed:", profileErr);
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (err) {
        console.error("Session check failed:", err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log("Auth state change:", event, session?.user?.id);
        
        setUser(session?.user ?? null);
        
        // Only check username for sign in events and after initial session check
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && sessionChecked) {
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('username')
              .eq('user_id', session.user.id)
              .single();

            if (profileError) {
              console.error("Profile error on auth change:", profileError);
            } else if (!profile?.username) {
              navigate("/username-setup");
              return;
            }
          } catch (profileErr) {
            console.error("Profile check failed on auth change:", profileErr);
          }
        }
        
        // Set loading to false after any auth state change if session was already checked
        if (sessionChecked && mounted) {
          setLoading(false);
        }
      }
    );

    // Get initial session after setting up listener
    getSession();

    // Cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            ZETECH MD BOT
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Secure API Key Management Dashboard for your Telegram Bot. 
            Generate, manage, and monitor your bot's authentication keys with ease.
          </p>
          <Button size="lg" onClick={() => navigate("/auth")} className="gap-2">
            <Key className="h-5 w-5" />
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader className="text-center">
              <Key className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>API Key Generation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Generate secure API keys with customizable durations - from 1 week to forever.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Secure Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Built-in API endpoint for your Telegram bot to verify keys securely.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-center">
              <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Real-time Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Monitor usage, track expiration dates, and manage all your API keys in one place.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Ready to Get Started?</CardTitle>
              <CardDescription>
                Create your account and start managing your bot's API keys today.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/auth")} className="w-full gap-2">
                <Key className="h-4 w-4" />
                Create Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;