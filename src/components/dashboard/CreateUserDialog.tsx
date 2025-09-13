import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateUserDialogProps {
  onUserCreated: () => void;
}

interface CreateUserForm {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  role: 'user' | 'admin' | 'super_admin';
}

interface UsernameCheck {
  available: boolean;
  username: string;
  message: string;
}

export default function CreateUserDialog({ onUserCreated }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameCheck, setUsernameCheck] = useState<UsernameCheck | null>(null);
  const [form, setForm] = useState<CreateUserForm>({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: 'user'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!form.email || !form.username || !form.password || !form.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (form.password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (form.username.length < 3) {
      toast({
        title: "Validation Error",
        description: "Username must be at least 3 characters long",
        variant: "destructive",
      });
      return;
    }

    // Check if username is available
    if (usernameCheck && !usernameCheck.available) {
      toast({
        title: "Validation Error",
        description: "Username is already taken. Please choose a different username.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use the database function to create user profile
      const { data, error } = await supabase.rpc('admin_create_user', {
        p_email: form.email,
        p_username: form.username,
        p_password: form.password,
        p_role: form.role
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      const response = data as any;
      if (response.success) {
        toast({
          title: "User Profile Created",
          description: `User profile for ${form.username} (${form.email}) has been created. The user can now sign up with these credentials and their profile will be automatically linked.`,
        });

        // Reset form and close dialog
        setForm({
          email: "",
          username: "",
          password: "",
          confirmPassword: "",
          role: 'user'
        });
        setUsernameCheck(null);
        setOpen(false);
        onUserCreated();
      } else {
        toast({
          title: "Error Creating User",
          description: response.message || "Failed to create user",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Create user error:', error);
      
      let errorMessage = "Failed to create user";
      if (error.message.includes('already registered')) {
        errorMessage = "A user with this email already exists";
      } else if (error.message.includes('username')) {
        errorMessage = "Username is already taken";
      } else if (error.message.includes('email')) {
        errorMessage = "Invalid email address";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Error Creating User",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateUserForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));

    // Check username availability when username changes
    if (field === 'username' && value.length >= 3) {
      checkUsernameAvailability(value);
    } else if (field === 'username' && value.length < 3) {
      setUsernameCheck(null);
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) return;
    
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <UserPlus className="h-3 w-3" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user profile. The user will need to sign up with the provided email and password to activate their account.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                value={form.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="username"
                minLength={3}
                required
                className={usernameCheck ? (usernameCheck.available ? 'border-green-500' : 'border-red-500') : ''}
              />
              {isCheckingUsername && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
            {usernameCheck && (
              <p className={`text-xs mt-1 ${
                usernameCheck.available ? 'text-green-600' : 'text-red-600'
              }`}>
                {usernameCheck.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter password"
              minLength={6}
              required
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="Confirm password"
              minLength={6}
              required
            />
          </div>

          <div>
            <Label htmlFor="role">User Role</Label>
            <Select value={form.role} onValueChange={(value: 'user' | 'admin' | 'super_admin') => handleInputChange('role', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
