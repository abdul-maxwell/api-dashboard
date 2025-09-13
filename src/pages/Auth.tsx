import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AuthForm from "@/components/auth/AuthForm";

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle OAuth callback
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Session error:', error);
          return;
        }

        if (data.session) {
          console.log('Session found, checking username...');
          // Check if user has a username
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', data.session.user.id)
            .single();

          if (profile?.username) {
            console.log('User has username, redirecting to dashboard');
            navigate("/");
          } else {
            console.log('User has no username, redirecting to username setup');
            navigate("/username-setup");
          }
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
      }
    };

    handleAuthCallback();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        
        if (session) {
          // Handle Google OAuth users - ensure they have a profile
          if (session.user.app_metadata?.provider === 'google') {
            try {
              console.log('Google OAuth user detected, ensuring profile exists...');
              console.log('User ID:', session.user.id);
              console.log('User email:', session.user.email);
              
              const { data, error } = await supabase.rpc('ensure_google_user_profile', {
                p_user_id: session.user.id
              });

              if (error) {
                console.error('Error ensuring Google user profile:', error);
                // Don't show error toast, just log it and continue
                // The user can still proceed to username setup
              } else {
                console.log('Google user profile ensured:', data);
              }
            } catch (error) {
              console.error('Error handling Google OAuth user:', error);
              // Don't block the flow, just log the error
            }
          }
          
          // Check if user has a username after authentication
          console.log('Checking if user has username...');
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', session.user.id)
            .single();

          console.log('Profile check result:', { profile, profileError });

          if (profile?.username) {
            console.log('User has username, redirecting to dashboard');
            navigate("/");
          } else {
            console.log('User has no username, redirecting to username setup');
            navigate("/username-setup");
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  return <AuthForm />;
}