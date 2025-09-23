import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  AlertCircle,
  Loader2,
  CreditCard,
  Smartphone,
  RotateCcw,
  X
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { TransactionService } from "@/lib/transactionService";

interface PaymentVerificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutRequestId: string;
  transactionId: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  apiKeyName: string;
  duration: string;
  onPaymentSuccess: () => void;
  onRetry: () => void;
}

type PaymentStatus = 'verifying' | 'success' | 'failed' | 'cancelled' | 'timeout';

export default function PaymentVerificationDialog({
  isOpen,
  onClose,
  checkoutRequestId,
  transactionId,
  amount,
  currency,
  phoneNumber,
  apiKeyName,
  duration,
  onPaymentSuccess,
  onRetry
}: PaymentVerificationDialogProps) {
  const [status, setStatus] = useState<PaymentStatus>('verifying');
  const [isPolling, setIsPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [receiptNumber, setReceiptNumber] = useState<string>('');

  const maxPollAttempts = 30; // Poll for 5 minutes (30 * 10 seconds)
  const pollInterval = 10000; // 10 seconds

  useEffect(() => {
    if (isOpen && checkoutRequestId) {
      startPolling();
    }
  }, [isOpen, checkoutRequestId]);

  const startPolling = () => {
    setStatus('verifying');
    setIsPolling(true);
    setPollCount(0);
    setErrorMessage('');
    setReceiptNumber('');
    pollTransactionStatus();
  };

  const pollTransactionStatus = async () => {
    if (pollCount >= maxPollAttempts) {
      setStatus('timeout');
      setIsPolling(false);
      return;
    }

    try {
      console.log(`Polling transaction status with Daraja API (attempt ${pollCount + 1}/${maxPollAttempts})`);
      
      // Use the improved query function that directly calls Daraja API
      const result = await TransactionService.queryTransactionStatus(checkoutRequestId);
      console.log('Daraja API verification result:', result);
      
      if (result.success && result.transaction) {
        const transaction = result.transaction;
        console.log('Real-time transaction status from Daraja:', transaction.status);
        
        switch (transaction.status) {
          case 'success':
            setStatus('success');
            setIsPolling(false);
            setReceiptNumber(transaction.provider_transaction_id || '');
            toast({
              title: "Payment Successful! 🎉",
              description: "Your API key has been activated and is ready to use.",
            });
            onPaymentSuccess();
            break;
          case 'failed':
            setStatus('failed');
            setIsPolling(false);
            setErrorMessage(transaction.error_message || 'Payment failed');
            toast({
              title: "Payment Failed",
              description: transaction.error_message || 'Payment could not be processed',
              variant: "destructive",
            });
            break;
          case 'cancelled':
            setStatus('cancelled');
            setIsPolling(false);
            setErrorMessage('Payment was cancelled by user');
            toast({
              title: "Payment Cancelled",
              description: "You cancelled the payment. You can try again anytime.",
            });
            break;
          case 'pending':
          case 'processing':
            // Continue polling - transaction is still being processed by Safaricom
            console.log('Payment still processing with Safaricom, continuing to poll...');
            setPollCount(prev => prev + 1);
            setTimeout(pollTransactionStatus, pollInterval);
            break;
          default:
            // Continue polling for unknown statuses
            console.log(`Unknown status: ${transaction.status}, continuing to poll...`);
            setPollCount(prev => prev + 1);
            setTimeout(pollTransactionStatus, pollInterval);
            break;
        }
      } else {
        // API query failed, continue polling
        console.warn('Failed to query transaction status from Daraja API, retrying...');
        setPollCount(prev => prev + 1);
        setTimeout(pollTransactionStatus, pollInterval);
      }
    } catch (error: any) {
      console.error('Error polling Daraja API transaction status:', error);
      
      // Handle rate limiting from Daraja API
      if (error.message?.includes('Spike arrest') || error.message?.includes('rate limit')) {
        console.warn('Daraja API rate limit detected, increasing poll interval...');
        setPollCount(prev => prev + 1);
        setTimeout(pollTransactionStatus, pollInterval * 2); // Double the interval
        return;
      }
      
      // Show warning after multiple attempts
      if (pollCount > 3) {
        console.warn('Multiple Daraja API polling errors detected, but continuing...');
      }
      
      // Stop polling only after many consecutive errors
      if (pollCount > 15) {
        console.error('Too many consecutive Daraja API errors, treating as timeout');
        setStatus('timeout');
        setIsPolling(false);
        setErrorMessage('Unable to verify payment status. Please check your M-Pesa messages or contact support.');
        return;
      }
      
      setPollCount(prev => prev + 1);
      setTimeout(pollTransactionStatus, pollInterval);
    }
  };

  const handleRetry = () => {
    onRetry();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'KES'
    }).format(amount);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'verifying':
        return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'failed':
        return <XCircle className="h-8 w-8 text-red-500" />;
      case 'cancelled':
        return <XCircle className="h-8 w-8 text-orange-500" />;
      case 'timeout':
        return <Clock className="h-8 w-8 text-yellow-500" />;
      default:
        return <AlertCircle className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case 'verifying':
        return 'Verifying Payment';
      case 'success':
        return 'Payment Successful!';
      case 'failed':
        return 'Payment Failed';
      case 'cancelled':
        return 'Payment Cancelled';
      case 'timeout':
        return 'Payment Timeout';
      default:
        return 'Payment Status';
    }
  };

  const getStatusDescription = () => {
    switch (status) {
      case 'verifying':
        return `Please wait while we verify your payment with Safaricom M-Pesa in real-time. Check your phone for the STK push prompt and complete the payment. (${pollCount}/${maxPollAttempts})`;
      case 'success':
        return '🎉 Congratulations! Your payment has been verified with Safaricom and processed successfully! Your API key is now active and ready to use.';
      case 'failed':
        return errorMessage || 'Your payment could not be processed according to Safaricom records. Please try again.';
      case 'cancelled':
        return 'You cancelled the payment on your M-Pesa prompt. You can try again anytime.';
      case 'timeout':
        return 'Payment verification timed out. Please check your phone for the M-Pesa prompt or try again. The payment may still be processing with Safaricom.';
      default:
        return 'Checking payment status with Safaricom M-Pesa...';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'verifying':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-orange-100 text-orange-800';
      case 'timeout':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Verification
          </DialogTitle>
          <DialogDescription>
            We're processing your payment for {apiKeyName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Display */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            <h3 className="text-lg font-semibold mb-2">{getStatusTitle()}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {getStatusDescription()}
            </p>
            <Badge className={getStatusColor()}>
              {status.toUpperCase()}
            </Badge>
            
            {/* Success Animation */}
            {status === 'success' && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">API Key Activated!</span>
                </div>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="font-semibold">{formatAmount(amount, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Phone:</span>
                  <span className="font-mono text-sm">{phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Duration:</span>
                  <span className="text-sm">{duration.replace('_', ' ')}</span>
                </div>
                {receiptNumber && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Receipt:</span>
                    <span className="font-mono text-sm">{receiptNumber}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {status === 'verifying' && (
              <div className="flex-1">
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
            
            {(status === 'failed' || status === 'cancelled' || status === 'timeout') && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleRetry}
                  className="flex-1"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancel}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </>
            )}
            
            {status === 'success' && (
              <Button 
                onClick={handleCancel}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Continue to Dashboard
              </Button>
            )}
          </div>

          {/* Progress Indicator */}
          {status === 'verifying' && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Verifying payment...</span>
                <span>{pollCount}/{maxPollAttempts}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(pollCount / maxPollAttempts) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Checking with Safaricom every 10 seconds...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
