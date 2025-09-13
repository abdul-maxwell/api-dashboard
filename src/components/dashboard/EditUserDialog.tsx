import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Loader2, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface User {
  user_id: string;
  email: string;
  username: string;
  role: string;
  created_at: string;
  api_keys: any[];
}

interface EditUserDialogProps {
  user: User;
  onUserUpdated: () => void;
}

interface EditUserForm {
  email: string;
  username: string;
  role: 'user' | 'admin' | 'super_admin';
  newPassword: string;
  confirmPassword: string;
}

export default function EditUserDialog({ user, onUserUpdated }: EditUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<EditUserForm>({
    email: "",
    username: "",
    role: 'user',
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    if (user && open) {
      setForm({
        email: user.email,
        username: user.username,
        role: user.role as 'user' | 'admin' | 'super_admin',
        newPassword: "",
        confirmPassword: ""
      });
    }
  }, [user, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!form.email || !form.username) {
      toast({
        title: "Validation Error",
        description: "Email and username are required",
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

    // If password is provided, validate it
    if (form.newPassword && form.newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use the database function to update user
      const { data, error } = await supabase.rpc('admin_update_user', {
        p_user_id: user.user_id,
        p_email: form.email,
        p_username: form.username,
        p_role: form.role,
        p_new_password: form.newPassword || null
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      const response = data as any;
      if (response.success) {
        toast({
          title: "User Updated Successfully",
          description: `User ${form.username} has been updated`,
        });

        setOpen(false);
        onUserUpdated();
      } else {
        toast({
          title: "Error Updating User",
          description: response.message || "Failed to update user",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Update user error:', error);
      
      let errorMessage = "Failed to update user";
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
        title: "Error Updating User",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof EditUserForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Edit className="h-3 w-3" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit User: {user.username}
          </DialogTitle>
          <DialogDescription>
            Update user information and role
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
            <Input
              id="username"
              type="text"
              value={form.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="username"
              minLength={3}
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

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password (Optional)</Label>
            <Input
              id="newPassword"
              type="password"
              value={form.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              placeholder="Leave blank to keep current password"
              minLength={6}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to keep the current password
            </p>
          </div>

          {form.newPassword && (
            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>
          )}

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
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Update User
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
