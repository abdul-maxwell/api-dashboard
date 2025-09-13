import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AuthForm from "@/components/auth/AuthForm";

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check if user has a username
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('user_id', session.user.id)
          .single();

        if (profile?.username) {
          navigate("/");
        } else {
          navigate("/username-setup");
        }
      }
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          // Handle Google OAuth users - ensure they have a profile
          if (session.user.app_metadata?.provider === 'google') {
            try {
              console.log('Google OAuth user detected, ensuring profile exists...');
              const { data, error } = await supabase.rpc('ensure_google_user_profile', {
                p_user_id: session.user.id
              });

              if (error) {
                console.error('Error ensuring Google user profile:', error);
                toast({
                  title: "Profile Setup Error",
                  description: "There was an issue setting up your profile. Please try again.",
                  variant: "destructive",
                });
                return;
              }

              console.log('Google user profile ensured:', data);
            } catch (error) {
              console.error('Error handling Google OAuth user:', error);
            }
          }
          
          // Check if user has a username after authentication
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', session.user.id)
            .single();

          if (profile?.username) {
            navigate("/");
          } else {
            navigate("/username-setup");
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  return <AuthForm />;
}