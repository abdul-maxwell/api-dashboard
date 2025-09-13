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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      // Check if user already has a username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', session.user.id)
        .single();

      if (profile?.username) {
        // User already has a username, redirect to dashboard
        navigate("/");
        return;
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
      const { data, error } = await supabase.rpc('check_username_availability', {
        p_username: username
      });

      if (error) {
        console.error('Username check error:', error);
        return;
      }

      setUsernameCheck(data as unknown as UsernameCheck);
    } catch (error) {
      console.error('Username check error:', error);
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
      // Update the user's profile with the username
      const { error } = await supabase
        .from('profiles')
        .update({ 
          username: username,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Username update error:', error);
        toast({
          title: "Error",
          description: "Failed to set username. Please try again.",
          variant: "destructive",
        });
        return;
      }

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
        description: "An unexpected error occurred. Please try again.",
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
