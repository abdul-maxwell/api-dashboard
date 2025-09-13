import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, CheckCircle, XCircle } from "lucide-react";

interface UsernameCheck {
  available: boolean;
  username: string;
  message: string;
}

export default function UsernameSetup() {
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      try {
        console.log('UsernameSetup: Checking user session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          toast({
            title: "Session Error",
            description: "Failed to get user session. Please try again.",
            variant: "destructive",
          });
          navigate("/auth");
          return;
        }

        if (!session) {
          console.log('No session found, redirecting to auth');
          navigate("/auth");
          return;
        }

        console.log('Session found, setting user:', session.user.email);
        setUser(session.user);

        // Check if user already has a username with timeout
        console.log('Checking if user has username...');
        const profilePromise = supabase
          .from('profiles')
          .select('username')
          .eq('user_id', session.user.id)
          .single();

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile check timeout')), 5000)
        );

        const { data: profile, error: profileError } = await Promise.race([
          profilePromise,
          timeoutPromise
        ]) as any;

        if (profileError) {
          console.log('Profile check error (this is normal for new users):', profileError);
          // Don't redirect, let user set username
        } else if (profile?.username) {
          console.log('User already has username, redirecting to dashboard');
          navigate("/");
          return;
        }

        console.log('User needs to set username');
      } catch (error) {
        console.error('Error in checkUser:', error);
        toast({
          title: "Error",
          description: "Failed to check user status. Please try again.",
          variant: "destructive",
        });
        // Don't redirect on error, let user try to set username
      }
    };

    checkUser();
  }, [navigate]);

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameCheck(null);
      return;
    }
    
    setIsCheckingUsername(true);
    try {
      console.log('Checking username availability for:', username);
      
      const checkPromise = supabase.rpc('check_username_availability', {
        p_username: username
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Username check timeout')), 10000)
      );

      const { data, error } = await Promise.race([
        checkPromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('Username check error:', error);
        setUsernameCheck({
          available: false,
          username,
          message: 'Error checking username availability'
        });
        return;
      }

      console.log('Username check result:', data);
      setUsernameCheck(data as unknown as UsernameCheck);
    } catch (error) {
      console.error('Unexpected error:', error);
      setUsernameCheck({
        available: false,
        username,
        message: 'Error checking username availability'
      });
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (value.length >= 3) {
      checkUsernameAvailability(value);
    } else {
      setUsernameCheck(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (username.length < 3) {
      toast({
        title: "Username too short",
        description: "Username must be at least 3 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (usernameCheck && !usernameCheck.available) {
      toast({
        title: "Username not available",
        description: "Please choose a different username.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Setting username for user:', user.id);
      console.log('Username to set:', username);
      
      // First, check if profile exists, if not create it
      const profileCheckPromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile check timeout')), 10000)
      );

      const { data: existingProfile, error: checkError } = await Promise.race([
        profileCheckPromise,
        timeoutPromise
      ]) as any;

      console.log('Existing profile check:', { existingProfile, checkError });

      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Profile does not exist, creating new profile...');
        const insertPromise = supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            email: user.email,
            username: username,
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        const insertTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile creation timeout')), 15000)
        );

        const { error: insertError } = await Promise.race([
          insertPromise,
          insertTimeoutPromise
        ]) as any;

        if (insertError) {
          console.error('Profile creation error:', insertError);
          toast({
            title: "Error",
            description: `Failed to create profile: ${insertError.message}`,
            variant: "destructive",
          });
          return;
        }
      } else if (checkError) {
        console.error('Profile check error:', checkError);
        toast({
          title: "Error",
          description: `Failed to check profile: ${checkError.message}`,
          variant: "destructive",
        });
        return;
      } else {
        // Profile exists, update it
        console.log('Profile exists, updating username...');
        const updatePromise = supabase
          .from('profiles')
          .update({ 
            username: username,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        const updateTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Profile update timeout')), 15000)
        );

        const { error: updateError } = await Promise.race([
          updatePromise,
          updateTimeoutPromise
        ]) as any;

        if (updateError) {
          console.error('Username update error:', updateError);
          toast({
            title: "Error",
            description: `Failed to set username: ${updateError.message}`,
            variant: "destructive",
          });
          return;
        }
      }

      console.log('Username set successfully, redirecting to dashboard...');
      toast({
        title: "Username set successfully!",
        description: `Welcome, ${username}! You can now access your dashboard.`,
      });

      // Redirect to dashboard
      navigate("/");
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${error}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUsernameStatus = () => {
    if (!usernameCheck) return null;
    
    if (usernameCheck.available) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">{usernameCheck.message}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="h-4 w-4" />
          <span className="text-sm">{usernameCheck.message}</span>
        </div>
      );
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Choose Your Username</CardTitle>
          <CardDescription>
            Welcome! Please choose a username to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  minLength={3}
                  required
                  className={usernameCheck ? (usernameCheck.available ? 'border-green-500' : 'border-red-500') : ''}
                />
                {isCheckingUsername && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              {getUsernameStatus()}
              <p className="text-xs text-muted-foreground">
                Username must be at least 3 characters long and can contain letters, numbers, and underscores.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={user.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                This is the email address associated with your account.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || !usernameCheck?.available}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Setup
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              By completing setup, you agree to our terms of service and privacy policy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
