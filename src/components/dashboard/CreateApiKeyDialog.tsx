import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CreateApiKeyDialogProps {
  onApiKeyCreated: () => void;
}

export default function CreateApiKeyDialog({ onApiKeyCreated }: CreateApiKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [duration, setDuration] = useState<"1_week" | "30_days" | "60_days" | "forever">("1_week");

  const generateApiKey = () => {
    // Generate a secure API key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'ztmd_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !duration) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error("Not authenticated");
      }

      const keyValue = generateApiKey();
      
      // Calculate expiration date
      let expiresAt = null;
      if (duration !== "forever") {
        const { data: expirationData, error: expirationError } = await supabase
          .rpc('calculate_expiration_date', { p_duration: duration });
        
        if (expirationError) {
          throw expirationError;
        }
        expiresAt = expirationData;
      }

      const { error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          name: name.trim(),
          key_value: keyValue,
          duration: duration as "1_week" | "30_days" | "60_days" | "forever",
          expires_at: expiresAt,
          is_active: true,
          is_trial: true, // This is a trial API key created directly by user
          payment_status: "completed", // Trial keys are considered "completed"
        });

      if (error) {
        throw error;
      }

      toast({
        title: "API Key Created",
        description: `Successfully created "${name}"`,
      });

      setName("");
      setDuration("1_week");
      setOpen(false);
      onApiKeyCreated();
    } catch (error: any) {
      toast({
        title: "Failed to create API key",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New API Key</DialogTitle>
          <DialogDescription>
            Generate a new API key for your ZETECH MD BOT
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My Bot API Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration</Label>
            <Select value={duration} onValueChange={(value) => setDuration(value as "1_week" | "30_days" | "60_days" | "forever")} required>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1_week">1 Week</SelectItem>
                <SelectItem value="30_days">30 Days</SelectItem>
                <SelectItem value="60_days">60 Days</SelectItem>
                <SelectItem value="forever">Forever</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}