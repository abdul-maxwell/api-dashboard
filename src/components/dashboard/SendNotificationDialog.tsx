import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Send, User, AlertCircle, Info, CheckCircle, AlertTriangle } from "lucide-react";
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

interface SendNotificationDialogProps {
  users: User[];
  onNotificationSent: () => void;
}

interface NotificationForm {
  targetUserId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  priority: 'low' | 'medium' | 'high';
}

export default function SendNotificationDialog({ users, onNotificationSent }: SendNotificationDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState<NotificationForm>({
    targetUserId: "",
    title: "",
    message: "",
    type: 'info',
    priority: 'medium'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.targetUserId || !form.title || !form.message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Call the database function to send notification
      const { data, error } = await supabase.rpc('send_notification', {
        p_user_id: form.targetUserId,
        p_title: form.title,
        p_message: form.message,
        p_type: form.type,
        p_priority: form.priority
      });

      if (error) {
        console.error('RPC error:', error);
        throw error;
      }

      const response = data as any;
      if (response.success) {
        const selectedUser = users.find(user => user.user_id === form.targetUserId);
        
        toast({
          title: "Notification Sent",
          description: `Notification sent successfully to ${selectedUser?.email}`,
        });

        // Reset form
        setForm({
          targetUserId: "",
          title: "",
          message: "",
          type: 'info',
          priority: 'medium'
        });
        
        setOpen(false);
        onNotificationSent();
      } else {
        toast({
          title: "Error",
          description: response.message || "Failed to send notification",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Send notification error:', error);
      toast({
        title: "Error",
        description: `Failed to send notification: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'high':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Bell className="h-4 w-4" />
          Send Notification
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Send Notification
          </DialogTitle>
          <DialogDescription>
            Send a notification to a specific user
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetUser">Target User *</Label>
            <Select 
              value={form.targetUserId} 
              onValueChange={(value) => setForm(prev => ({ ...prev, targetUserId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id || 'unknown'}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{user.email}</span>
                      <span className="text-muted-foreground">({user.username})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Notification Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., API Key Expiring Soon"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={form.message}
              onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Enter your notification message here..."
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {form.message.length}/500 characters
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Notification Type</Label>
              <Select 
                value={form.type} 
                onValueChange={(value: 'info' | 'warning' | 'success' | 'error') => 
                  setForm(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      {getTypeIcon('info')}
                      <span>Info</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      {getTypeIcon('warning')}
                      <span>Warning</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="success">
                    <div className="flex items-center gap-2">
                      {getTypeIcon('success')}
                      <span>Success</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="error">
                    <div className="flex items-center gap-2">
                      {getTypeIcon('error')}
                      <span>Error</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={form.priority} 
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setForm(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <span className="text-green-600">Low</span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className="text-yellow-600">Medium</span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className="text-red-600">High</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          {form.title && form.message && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  {getTypeIcon(form.type)}
                  <span className="font-medium">{form.title}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(form.priority)}`}>
                    {form.priority.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{form.message}</p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !form.targetUserId || !form.title || !form.message}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Notification
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
