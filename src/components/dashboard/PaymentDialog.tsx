import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Smartphone, Clock, Zap, Crown, Infinity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionService } from "@/lib/transactionService";

interface PaymentDialogProps {
  onPaymentInitiated: () => void;
}

const pricingPlans = [
  {
    duration: "1_week",
    label: "1 Week",
    price: 50,
    icon: Clock,
    description: "Perfect for short-term projects",
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    duration: "30_days",
    label: "1 Month",
    price: 100,
    icon: Zap,
    description: "Great for ongoing development",
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-900/20",
  },
  {
    duration: "60_days",
    label: "2 Months",
    price: 300,
    icon: Crown,
    description: "Extended access for larger projects",
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    duration: "forever",
    label: "Lifetime",
    price: 500,
    icon: Infinity,
    description: "Unlimited access forever",
    color: "text-gold-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
  },
];

export default function PaymentDialog({ onPaymentInitiated }: PaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");
  const [apiKeyName, setApiKeyName] = useState("");
  const { toast } = useToast();

  const selectedPlanData = pricingPlans.find(plan => plan.duration === selectedPlan);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phoneNumber || !selectedPlan || !apiKeyName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Generate a unique transaction ID
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Track payment attempt
      await TransactionService.trackPaymentAttempt(
        session.user.id,
        transactionId,
        selectedPlanData?.price || 0,
        'KES',
        'mpesa',
        `Payment for ${selectedPlanData?.label} API key: ${apiKeyName}`
      );

      const response = await supabase.functions.invoke("mpesa-payment", {
        body: {
          phone_number: phoneNumber,
          amount: selectedPlanData?.price,
          duration: selectedPlan,
          api_key_name: apiKeyName,
          transaction_id: transactionId, // Pass transaction ID to the function
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        // Track payment failure
        await TransactionService.trackPaymentFailure(
          transactionId,
          response.error.message
        );
        throw new Error(response.error.message);
      }

      const { data } = response;
      
      if (data.success) {
        // Update transaction status to pending
        await TransactionService.updateTransaction({
          transactionId,
          status: 'pending',
          successMessage: 'Payment initiated successfully, waiting for user confirmation'
        });

        toast({
          title: "Payment Initiated! 🎉",
          description: "Check your phone for the M-Pesa prompt. Your API key will be activated once payment is confirmed.",
        });
        
        setIsOpen(false);
        setPhoneNumber("");
        setSelectedPlan("");
        setApiKeyName("");
        onPaymentInitiated();
      } else {
        throw new Error("Payment initiation failed");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      
      // Try to track the error if we have a transaction ID
      try {
        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await TransactionService.trackPaymentFailure(
          transactionId,
          error.message || "Payment failed due to unknown error"
        );
      } catch (trackingError) {
        console.error("Failed to track payment error:", trackingError);
      }
      
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="btn-glow bg-gradient-primary border-0 font-poppins font-semibold">
          <CreditCard className="w-4 h-4 mr-2" />
          Purchase API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-poppins font-bold bg-gradient-primary bg-clip-text text-transparent">
            Purchase API Key
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose your plan and pay securely with M-Pesa
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handlePayment} className="space-y-6">
          {/* Pricing Plans */}
          <div className="space-y-4">
            <Label className="text-lg font-poppins font-semibold">Choose Your Plan</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pricingPlans.map((plan) => {
                const Icon = plan.icon;
                return (
                  <Card
                    key={plan.duration}
                    className={`cursor-pointer transition-smooth card-hover ${
                      selectedPlan === plan.duration
                        ? "ring-2 ring-primary shadow-[var(--shadow-elegant)]"
                        : "hover:shadow-[var(--shadow-card)]"
                    } ${plan.bgColor}`}
                    onClick={() => setSelectedPlan(plan.duration)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${plan.bgColor}`}>
                            <Icon className={`w-5 h-5 ${plan.color}`} />
                          </div>
                          <div>
                            <h3 className="font-poppins font-semibold">{plan.label}</h3>
                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-primary">KSh {plan.price}</div>
                          {plan.duration === "forever" && (
                            <div className="text-xs text-muted-foreground">One-time</div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* API Key Name */}
          <div className="space-y-2">
            <Label htmlFor="apiKeyName" className="font-poppins font-medium">
              API Key Name
            </Label>
            <Input
              id="apiKeyName"
              value={apiKeyName}
              onChange={(e) => setApiKeyName(e.target.value)}
              placeholder="Enter a name for your API key"
              className="transition-smooth focus:shadow-[var(--shadow-card)]"
              required
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="font-poppins font-medium flex items-center">
              <Smartphone className="w-4 h-4 mr-2" />
              M-Pesa Phone Number
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0712345678 or +254712345678"
              className="transition-smooth focus:shadow-[var(--shadow-card)]"
              required
            />
            <p className="text-sm text-muted-foreground">
              Enter your M-Pesa registered phone number
            </p>
          </div>

          {/* Payment Summary */}
          {selectedPlanData && (
            <div className="bg-gradient-secondary p-4 rounded-lg border animate-fade-in">
              <h4 className="font-poppins font-semibold text-lg mb-2">Payment Summary</h4>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">
                  {selectedPlanData.label} API Key Access
                </span>
                <span className="font-bold text-xl text-primary">
                  KSh {selectedPlanData.price}
                </span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1 transition-smooth"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !selectedPlan}
              className="flex-1 btn-glow bg-gradient-primary font-poppins font-semibold"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                  Processing...
                </div>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 mr-2" />
                  Pay with M-Pesa
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}