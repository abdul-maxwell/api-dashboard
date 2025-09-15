import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const callbackData = await req.json();
    console.log("M-Pesa callback received:", JSON.stringify(callbackData, null, 2));

    const { Body } = callbackData;
    const { stkCallback } = Body;
    
    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    // Find the transaction record first
    const { data: transaction, error: transactionFindError } = await supabase
      .from("transactions")
      .select("*")
      .eq("provider_transaction_id", checkoutRequestID)
      .single();

    if (transactionFindError || !transaction) {
      console.error("Transaction not found:", transactionFindError);
      return new Response("Transaction not found", { status: 404 });
    }

    // Find the payment record
    const { data: payment, error: paymentFindError } = await supabase
      .from("payments")
      .select("*, api_keys(*)")
      .eq("mpesa_checkout_request_id", checkoutRequestID)
      .single();

    if (paymentFindError || !payment) {
      console.error("Payment not found:", paymentFindError);
      return new Response("Payment not found", { status: 404 });
    }

    // Determine transaction status based on result code
    let transactionStatus: string;
    let paymentStatus: string;
    let apiKeyStatus: string;
    let isActive: boolean;
    let receiptNumber = "";
    let errorMessage = "";
    let successMessage = "";

    if (resultCode === 0) {
      // Payment successful
      transactionStatus = "success";
      paymentStatus = "completed";
      apiKeyStatus = "completed";
      isActive = true;
      successMessage = "Payment completed successfully";

      // Extract receipt number from callback metadata
      if (stkCallback.CallbackMetadata && stkCallback.CallbackMetadata.Item) {
        const items = stkCallback.CallbackMetadata.Item;
        for (const item of items) {
          if (item.Name === "MpesaReceiptNumber") {
            receiptNumber = item.Value;
            break;
          }
        }
      }
    } else if (resultCode === 1032) {
      // User cancelled
      transactionStatus = "cancelled";
      paymentStatus = "cancelled";
      apiKeyStatus = "cancelled";
      isActive = false;
      errorMessage = "User cancelled the payment";
    } else if (resultCode === 1037) {
      // Timeout
      transactionStatus = "failed";
      paymentStatus = "timeout";
      apiKeyStatus = "failed";
      isActive = false;
      errorMessage = "Payment request timed out";
    } else {
      // Other failures
      transactionStatus = "failed";
      paymentStatus = "failed";
      apiKeyStatus = "failed";
      isActive = false;
      errorMessage = resultDesc || "Payment failed";
    }

    // Update transaction record
    const { error: transactionUpdateError } = await supabase.rpc('update_transaction_status', {
      p_transaction_id: transaction.transaction_id,
      p_status: transactionStatus,
      p_error_message: errorMessage || null,
      p_success_message: successMessage || null,
      p_provider_transaction_id: receiptNumber || checkoutRequestID,
      p_metadata: {
        ...transaction.metadata,
        callback_result_code: resultCode,
        callback_result_desc: resultDesc,
        receipt_number: receiptNumber,
        processed_at: new Date().toISOString()
      }
    });

    if (transactionUpdateError) {
      console.error("Error updating transaction:", transactionUpdateError);
    }

    // Update payment status
    const { error: paymentUpdateError } = await supabase
      .from("payments")
      .update({
        status: paymentStatus,
        mpesa_receipt_number: receiptNumber || null,
        completed_at: transactionStatus === "success" ? new Date().toISOString() : null,
      })
      .eq("id", payment.id);

    if (paymentUpdateError) {
      console.error("Error updating payment:", paymentUpdateError);
    }

    // Update API key status
    const { error: apiKeyUpdateError } = await supabase
      .from("api_keys")
      .update({
        payment_status: apiKeyStatus,
        is_active: isActive,
      })
      .eq("payment_id", payment.id);

    if (apiKeyUpdateError) {
      console.error("Error updating API key:", apiKeyUpdateError);
    }

    // Send notification to user
    if (transactionStatus === "success") {
      await supabase.rpc('send_notification', {
        p_user_id: transaction.user_id,
        p_title: "Payment Successful",
        p_message: `Your payment of KES ${transaction.amount} has been processed successfully. Your API key is now active.`,
        p_type: "success",
        p_priority: "high"
      });
    } else if (transactionStatus === "cancelled") {
      await supabase.rpc('send_notification', {
        p_user_id: transaction.user_id,
        p_title: "Payment Cancelled",
        p_message: "Your payment was cancelled. You can try again anytime.",
        p_type: "info",
        p_priority: "medium"
      });
    } else if (transactionStatus === "failed") {
      await supabase.rpc('send_notification', {
        p_user_id: transaction.user_id,
        p_title: "Payment Failed",
        p_message: `Your payment failed: ${errorMessage}. Please try again.`,
        p_type: "error",
        p_priority: "high"
      });
    }

    console.log(`Transaction ${transactionStatus} for checkout request: ${checkoutRequestID}, result code: ${resultCode}`);
    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("Error in M-Pesa callback:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

serve(handler);