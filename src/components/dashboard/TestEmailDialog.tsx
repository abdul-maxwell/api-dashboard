import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
import { Loader2, Mail } from "lucide-react";

export default function TestEmailDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  const handleTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!testEmail) {
      toast({
        title: "Email required",
        description: "Please enter an email address to test.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('Testing email sending to:', testEmail);
      
      // Test with password reset email
      const { data, error } = await supabase.auth.resetPasswordForEmail(testEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      console.log('Test email response:', { data, error });

      if (error) {
        console.error('Test email error:', error);
        toast({
          title: "Email test failed",
          description: `Error: ${error.message}. Check your SMTP configuration in Supabase dashboard.`,
          variant: "destructive",
        });
      } else {
        console.log('Test email sent successfully');
        toast({
          title: "Test email sent",
          description: `Password reset email sent to ${testEmail}. Check your inbox and spam folder.`,
        });
        setTestEmail("");
        setOpen(false);
      }
    } catch (error) {
      console.error('Unexpected error during email test:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Mail className="h-4 w-4" />
          Test Email
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Test Email Configuration</DialogTitle>
          <DialogDescription>
            Send a test password reset email to verify your SMTP configuration is working.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleTestEmail} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Test Email Address</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              required
            />
          </div>
          <div className="text-sm text-muted-foreground">
            This will send a password reset email to test your SMTP configuration.
            Check the browser console for detailed logs.
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Test Email
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
