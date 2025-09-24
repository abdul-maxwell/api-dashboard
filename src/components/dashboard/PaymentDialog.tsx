import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Smartphone, Clock, Zap, Crown, Infinity, Package, Star, CheckCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { TransactionService } from "@/lib/transactionService";
import PaymentVerificationDialog from "./PaymentVerificationDialog";

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
  const [promoCode, setPromoCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [promoOpen, setPromoOpen] = useState(false);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const { toast } = useToast();

  // Payment verification state
  const [showVerification, setShowVerification] = useState(false);
  const [paymentData, setPaymentData] = useState<{
    checkoutRequestId: string;
    transactionId: string;
    amount: number;
    currency: string;
    phoneNumber: string;
    apiKeyName: string;
    duration: string;
  } | null>(null);

  const selectedPlanData = packages.find(pkg => pkg.duration === selectedPlan);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const packagesData = await TransactionService.getPackages();
      setPackages(packagesData);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast({
        title: "Error",
        description: "Failed to load packages. Using default pricing.",
        variant: "destructive",
      });
    }
  };

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
      
      // Track payment attempt (optional - won't fail if tracking is unavailable)
      try {
        await TransactionService.trackPaymentAttempt(
          session.user.id,
          transactionId,
          selectedPlanData?.price_ksh || 0,
          'KES',
          'mpesa',
          `Payment for ${selectedPlanData?.name} API key: ${apiKeyName}`
        );
      } catch (trackingError) {
        console.warn('Transaction tracking failed, continuing with payment:', trackingError);
      }

      const response = await supabase.functions.invoke("mpesa-payment", {
        body: {
          phone_number: phoneNumber,
          amount: selectedPlanData?.price_ksh,
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
      
      if (data && data.success) {
        // Update transaction status to pending (optional)
        try {
          await TransactionService.updateTransaction({
            transactionId,
            status: 'pending',
            successMessage: 'Payment initiated successfully, waiting for user confirmation'
          });
        } catch (trackingError) {
          console.warn('Transaction status update failed:', trackingError);
        }

        // Show verification popup
        setPaymentData({
          checkoutRequestId: data.checkout_request_id,
          transactionId: data.transaction_id || transactionId,
          amount: appliedDiscount ? appliedDiscount.finalPrice : (selectedPlanData?.price_ksh || 0),
          currency: 'KES',
          phoneNumber,
          apiKeyName,
          duration: selectedPlan
        });
        
        setIsOpen(false);
        setShowVerification(true);
        
        // Clear form
        setPhoneNumber("");
        setSelectedPlan("");
        setApiKeyName("");
      } else {
        // Handle failed payment response
        const errorMessage = data?.error || "Payment initiation failed";
        
        // Track payment failure if we have a transaction ID
        if (data?.transaction_id) {
          try {
            await TransactionService.trackPaymentFailure(
              data.transaction_id,
              errorMessage
            );
          } catch (trackingError) {
            console.warn('Failed to track payment failure:', trackingError);
          }
        }
        
        throw new Error(errorMessage);
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

  const handlePaymentSuccess = () => {
    toast({
      title: "🎉 Payment Successful!",
      description: "Your API key has been activated successfully!",
    });
    setShowVerification(false);
    setPaymentData(null);
    onPaymentInitiated();
  };

  const handleRetryPayment = () => {
    setShowVerification(false);
    setPaymentData(null);
    setIsOpen(true);
  };

  const handleCloseVerification = () => {
    setShowVerification(false);
    setPaymentData(null);
  };

  const handlePromoCodeValidation = async () => {
    if (!promoCode.trim() || !selectedPlan) {
      toast({
        title: "Error",
        description: "Please select a plan and enter a promo code",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingPromo(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      const result = await TransactionService.applyPromoCode(
        promoCode,
        selectedPlanData?.id || '',
        user.id,
        selectedPlanData?.price_ksh || 0
      );

      if (result.valid) {
        setAppliedDiscount(result);
        toast({
          title: "Success!",
          description: `Promo code applied! You saved ${new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(result.discountAmount)}`,
        });
      } else {
        setAppliedDiscount(null);
        toast({
          title: "Invalid Promo Code",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error validating promo code:', error);
      toast({
        title: "Error",
        description: "Failed to validate promo code",
        variant: "destructive",
      });
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const removePromoCode = () => {
    setPromoCode("");
    setAppliedDiscount(null);
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="btn-glow bg-gradient-primary border-0 font-poppins font-semibold">
          <CreditCard className="w-4 h-4 mr-2" />
          Purchase API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl md:sm:max-w-2xl w-[95vw] sm:w-auto animate-scale-in max-h-[85vh] overflow-y-auto p-4 sm:p-6">
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
            {/* Mobile: carousel */}
            <div className="block sm:hidden">
              {packages.length > 0 ? (
                <Carousel className="w-full">
                  <CarouselContent>
                    {packages.map((pkg) => (
                      <CarouselItem key={pkg.id} className="basis-[85%] pl-2">
                        <Card
                          className={`cursor-pointer transition-smooth card-hover ${
                            selectedPlan === pkg.duration
                              ? 'ring-2 ring-primary shadow-[var(--shadow-elegant)]'
                              : 'hover:shadow-[var(--shadow-card)]'
                          } ${pkg.is_featured ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}
                          onClick={() => setSelectedPlan(pkg.duration)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${pkg.is_featured ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                  {pkg.is_featured ? <Crown className="w-5 h-5 text-yellow-600" /> : <Zap className="w-5 h-5 text-blue-600" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-poppins font-semibold">{pkg.name}</h3>
                                    {pkg.is_featured && (
                                      <Badge variant="secondary" className="text-xs">
                                        <Star className="h-3 w-3 mr-1" />
                                        Featured
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{pkg.description}</p>
                                  <p className="text-xs text-muted-foreground">{pkg.duration.replace('_', ' ')} • {pkg.duration_days} days</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  {pkg.original_price_ksh > pkg.price_ksh && (
                                    <span className="text-sm text-muted-foreground line-through">KSh {pkg.original_price_ksh}</span>
                                  )}
                                  <div className="text-xl font-bold text-primary">KSh {pkg.price_ksh}</div>
                                </div>
                                {pkg.original_price_ksh > pkg.price_ksh && (
                                  <Badge variant="destructive" className="text-xs mt-1">
                                    -{Math.round(((pkg.original_price_ksh - pkg.price_ksh) / pkg.original_price_ksh) * 100)}% OFF
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="flex justify-between mt-2 px-2">
                    <CarouselPrevious className="relative" />
                    <CarouselNext className="relative" />
                  </div>
                </Carousel>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4" />
                  <p>Loading packages...</p>
                </div>
              )}
            </div>
            {/* Desktop/tablet: grid */}
            <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 gap-4">
              {packages.length > 0 ? packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={`cursor-pointer transition-smooth card-hover ${
                    selectedPlan === pkg.duration
                      ? "ring-2 ring-primary shadow-[var(--shadow-elegant)]"
                      : "hover:shadow-[var(--shadow-card)]"
                  } ${pkg.is_featured ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}
                  onClick={() => setSelectedPlan(pkg.duration)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${pkg.is_featured ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                          {pkg.is_featured ? <Crown className="w-5 h-5 text-yellow-600" /> : <Zap className="w-5 h-5 text-blue-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-poppins font-semibold">{pkg.name}</h3>
                            {pkg.is_featured && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{pkg.description}</p>
                          <p className="text-xs text-muted-foreground">{pkg.duration.replace('_', ' ')} • {pkg.duration_days} days</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {pkg.original_price_ksh > pkg.price_ksh && (
                            <span className="text-sm text-muted-foreground line-through">
                              KSh {pkg.original_price_ksh}
                            </span>
                          )}
                          <div className="text-xl font-bold text-primary">KSh {pkg.price_ksh}</div>
                        </div>
                        {pkg.original_price_ksh > pkg.price_ksh && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            -{Math.round(((pkg.original_price_ksh - pkg.price_ksh) / pkg.original_price_ksh) * 100)}% OFF
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <div className="col-span-2 text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4" />
                  <p>Loading packages...</p>
                </div>
              )}
            </div>
          </div>

          {/* Promo Code (collapsible) */}
          <Collapsible open={promoOpen} onOpenChange={setPromoOpen}>
            <div className="flex items-center justify-between">
              <Label htmlFor="promo" className="mb-0">Promo Code (Optional)</Label>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">{promoOpen ? 'Hide' : 'Add'}</Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="space-y-4 mt-2">
                <div className="flex gap-2">
                  <Input
                    id="promo"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter promo code"
                    disabled={isValidatingPromo}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePromoCodeValidation}
                    disabled={isValidatingPromo || !promoCode.trim()}
                  >
                    {isValidatingPromo ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    ) : (
                      "Apply"
                    )}
                  </Button>
                </div>
                {appliedDiscount && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          Promo code applied: {appliedDiscount.discount.name}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removePromoCode}
                        className="text-green-600 hover:text-green-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      You saved {new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(appliedDiscount.discountAmount)}
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

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
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">
                    {selectedPlanData.name} API Key Access
                  </span>
                  <span className="font-bold text-lg text-primary">
                    KSh {selectedPlanData.price_ksh}
                  </span>
                </div>
                {appliedDiscount && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Discount ({appliedDiscount.discount.name})</span>
                      <span className="text-green-600 font-medium">
                        -KSh {appliedDiscount.discountAmount}
                      </span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold text-xl text-primary">
                          KSh {appliedDiscount.finalPrice}
                        </span>
                      </div>
                    </div>
                  </>
                )}
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

    {/* Payment Verification Dialog */}
    {paymentData && (
      <PaymentVerificationDialog
        isOpen={showVerification}
        onClose={handleCloseVerification}
        checkoutRequestId={paymentData.checkoutRequestId}
        transactionId={paymentData.transactionId}
        amount={paymentData.amount}
        currency={paymentData.currency}
        phoneNumber={paymentData.phoneNumber}
        apiKeyName={paymentData.apiKeyName}
        duration={paymentData.duration}
        onPaymentSuccess={handlePaymentSuccess}
        onRetry={handleRetryPayment}
      />
    )}
    </>
  );
}