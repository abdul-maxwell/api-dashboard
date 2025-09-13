import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Loader2, Clock, Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

interface ClaimTrialDialogProps {
  onTrialClaimed: () => void;
}

export default function ClaimTrialDialog({ onTrialClaimed }: ClaimTrialDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleClaimTrial = async () => {
    setIsLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Generate trial API key directly
      const keyValue = 'ak_' + Array.from({ length: 32 }, () => 
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
          .charAt(Math.floor(Math.random() * 62))
      ).join('');

      // Check if user already has a trial or has ever had one
      const hasStoredTrial = localStorage.getItem(`trial_used_${user.id}`) === 'true';
      if (hasStoredTrial) {
        throw new Error("You have already used your free trial. Only one trial per account is allowed.");
      }

      const { data: existingTrials } = await supabase
        .from('api_keys')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_trial', true);

      if (existingTrials && existingTrials.length > 0) {
        throw new Error("You have already claimed your free trial. Only one trial per account is allowed.");
      }

      // Deactivate any existing active API keys
      await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Create trial API key
      const { error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          name: '7-Day Free Trial',
          key_value: keyValue,
          duration: '1_week' as const,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          is_trial: true,
        });

      if (error) {
        throw error;
      }

      // Mark that the user has used their trial
      localStorage.setItem(`trial_used_${user.id}`, 'true');

      toast({
        title: "🎉 Free Trial Activated!",
        description: "Your 7-day free trial has been activated successfully!",
      });
      setOpen(false);
      onTrialClaimed();
    } catch (error: any) {
      toast({
        title: "Failed to claim trial",
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
        <Button className="btn-glow bg-gradient-primary border-0 font-poppins font-semibold text-lg px-8 py-4 h-auto">
          <Gift className="w-5 h-5 mr-2" />
          Claim Free 7-Day Trial
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-poppins font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center">
            <Gift className="w-6 h-6 mr-2 text-primary" />
            Free 7-Day Trial
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base">
            Start your journey with ZETECH MD BOT completely free!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Trial Benefits */}
          <Card className="bg-gradient-secondary border-primary/20">
            <CardContent className="p-6">
              <h3 className="font-poppins font-semibold text-lg mb-4 text-center">
                What's Included in Your Trial:
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <span>7 days of full access</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Key className="w-5 h-5 text-primary" />
                  <span>Complete API functionality</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Gift className="w-5 h-5 text-primary" />
                  <span>No payment required</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Ready to experience the power of ZETECH MD BOT?
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="flex-1 transition-smooth"
              >
                Not Now
              </Button>
              <Button
                onClick={handleClaimTrial}
                disabled={isLoading}
                className="flex-1 btn-glow bg-gradient-primary font-poppins font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Activating...
                  </>
                ) : (
                  <>
                    <Gift className="w-4 h-4 mr-2" />
                    Claim My Trial
                  </>
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Only one free trial per account. Trial begins immediately upon activation.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}