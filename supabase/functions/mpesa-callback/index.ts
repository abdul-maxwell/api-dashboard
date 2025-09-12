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

    if (resultCode === 0) {
      // Payment successful
      const callbackMetadata = stkCallback.CallbackMetadata;
      const items = callbackMetadata.Item;
      
      let receiptNumber = "";
      for (const item of items) {
        if (item.Name === "MpesaReceiptNumber") {
          receiptNumber = item.Value;
          break;
        }
      }

      // Update payment status
      const { error: paymentUpdateError } = await supabase
        .from("payments")
        .update({
          status: "completed",
          mpesa_receipt_number: receiptNumber,
        })
        .eq("id", payment.id);

      if (paymentUpdateError) {
        console.error("Error updating payment:", paymentUpdateError);
      }

      // Update API key status
      const { error: apiKeyUpdateError } = await supabase
        .from("api_keys")
        .update({
          payment_status: "completed",
          is_active: true,
        })
        .eq("payment_id", payment.id);

      if (apiKeyUpdateError) {
        console.error("Error updating API key:", apiKeyUpdateError);
      }

      console.log(`Payment completed for checkout request: ${checkoutRequestID}`);
    } else {
      // Payment failed
      const { error: paymentUpdateError } = await supabase
        .from("payments")
        .update({
          status: "failed",
        })
        .eq("id", payment.id);

      if (paymentUpdateError) {
        console.error("Error updating payment:", paymentUpdateError);
      }

      // Update API key status
      const { error: apiKeyUpdateError } = await supabase
        .from("api_keys")
        .update({
          payment_status: "failed",
          is_active: false,
        })
        .eq("payment_id", payment.id);

      if (apiKeyUpdateError) {
        console.error("Error updating API key:", apiKeyUpdateError);
      }

      console.log(`Payment failed for checkout request: ${checkoutRequestID}, reason: ${resultDesc}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error: any) {
    console.error("Error in M-Pesa callback:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

serve(handler);