import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MpesaCallbackData {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: any;
        }>;
      };
    };
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const callbackData: MpesaCallbackData = await req.json();
    console.log("M-Pesa callback received:", JSON.stringify(callbackData, null, 2));

    const { stkCallback } = callbackData.Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    // Find the transaction in our database
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .select("*")
      .eq("provider_transaction_id", CheckoutRequestID)
      .single();

    if (transactionError || !transaction) {
      console.error("Transaction not found:", transactionError);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    let transactionStatus: string;
    let paymentStatus: string;
    let apiKeyStatus: boolean;
    let receiptNumber: string | null = null;
    let notificationTitle: string;
    let notificationMessage: string;
    let notificationType: string;

    if (ResultCode === 0) {
      // Payment successful
      transactionStatus = "success";
      paymentStatus = "completed";
      apiKeyStatus = true;
      notificationTitle = "Payment Successful! 🎉";
      notificationMessage = "Your API key has been activated and is ready to use.";
      notificationType = "success";

      // Extract receipt number from callback metadata
      if (CallbackMetadata?.Item) {
        const receiptItem = CallbackMetadata.Item.find(item => item.Name === "MpesaReceiptNumber");
        receiptNumber = receiptItem?.Value || null;
      }

      console.log("Payment successful - Receipt:", receiptNumber);

    } else if (ResultCode === 1032) {
      // Payment cancelled by user
      transactionStatus = "cancelled";
      paymentStatus = "cancelled";
      apiKeyStatus = false;
      notificationTitle = "Payment Cancelled";
      notificationMessage = "You cancelled the payment. You can try again anytime.";
      notificationType = "warning";

      console.log("Payment cancelled by user");

    } else {
      // Payment failed
      transactionStatus = "failed";
      paymentStatus = "failed";
      apiKeyStatus = false;
      notificationTitle = "Payment Failed";
      notificationMessage = `Payment failed: ${ResultDesc}. Please try again.`;
      notificationType = "error";

      console.log("Payment failed:", ResultDesc);
    }

    // Update transaction status
    const { error: updateTransactionError } = await supabase
      .rpc('update_transaction_status', {
        p_transaction_id: transaction.transaction_id,
        p_status: transactionStatus,
        p_mpesa_receipt_number: receiptNumber,
        p_success_message: ResultCode === 0 ? "Payment completed successfully" : null,
        p_error_message: ResultCode !== 0 ? ResultDesc : null
      });

    if (updateTransactionError) {
      console.error("Error updating transaction:", updateTransactionError);
    }

    // Update payment status
    const { error: updatePaymentError } = await supabase
      .from("payments")
      .update({
        status: paymentStatus,
        mpesa_receipt_number: receiptNumber,
        updated_at: new Date().toISOString()
      })
      .eq("mpesa_checkout_request_id", CheckoutRequestID);

    if (updatePaymentError) {
      console.error("Error updating payment:", updatePaymentError);
    }

    // Update API key status
    const { error: updateApiKeyError } = await supabase
      .from("api_keys")
      .update({
        payment_status: paymentStatus,
        is_active: apiKeyStatus,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", transaction.user_id)
      .eq("payment_status", "pending");

    if (updateApiKeyError) {
      console.error("Error updating API key:", updateApiKeyError);
    }

    // Send notification to user
    const { error: notificationError } = await supabase
      .rpc('send_notification', {
        p_user_id: transaction.user_id,
        p_title: notificationTitle,
        p_message: notificationMessage,
        p_type: notificationType,
        p_priority: 'high'
      });

    if (notificationError) {
      console.error("Error sending notification:", notificationError);
    }

    console.log(`Transaction ${transaction.transaction_id} updated to ${transactionStatus}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Callback processed successfully",
        transaction_status: transactionStatus,
        receipt_number: receiptNumber
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error processing M-Pesa callback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);