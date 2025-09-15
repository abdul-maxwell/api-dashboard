import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QueryTransactionRequest {
  checkout_request_id: string;
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

    const { checkout_request_id }: QueryTransactionRequest = await req.json();

    if (!checkout_request_id) {
      return new Response(
        JSON.stringify({ error: "checkout_request_id is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get M-Pesa access token
    const consumerKey = Deno.env.get("DARAJA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("DARAJA_CONSUMER_SECRET");
    const passkey = Deno.env.get("DARAJA_PASSKEY");
    const shortcode = Deno.env.get("DARAJA_SHORTCODE");

    if (!consumerKey || !consumerSecret || !passkey || !shortcode) {
      throw new Error("Missing Daraja API credentials");
    }

    // Generate OAuth token
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenResponse = await fetch("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
      method: "GET",
      headers: {
        "Authorization": `Basic ${auth}`,
      },
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error("Failed to get M-Pesa access token");
    }

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").substring(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    // Query transaction status
    const queryData = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkout_request_id,
    };

    const queryResponse = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(queryData),
    });

    const queryResult = await queryResponse.json();
    console.log("Transaction query result:", queryResult);

    // Find the transaction in our database
    const { data: transaction, error: transactionError } = await supabase
      .from("transactions")
      .select("*")
      .eq("provider_transaction_id", checkout_request_id)
      .single();

    if (transactionError || !transaction) {
      console.error("Transaction not found in database:", transactionError);
      return new Response(
        JSON.stringify({ 
          error: "Transaction not found in database",
          mpesa_response: queryResult 
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Parse Daraja API response to determine transaction status
    let transactionStatus = transaction.status; // Default to current status
    let errorMessage = transaction.error_message;
    let successMessage = transaction.success_message;
    let receiptNumber = transaction.provider_transaction_id;

    if (queryResult.ResponseCode === "0") {
      // STK Push Query was successful, check the result
      if (queryResult.ResultCode === "0") {
        // Transaction was successful
        transactionStatus = "success";
        successMessage = "Payment completed successfully";
        receiptNumber = queryResult.MpesaReceiptNumber || queryResult.CheckoutRequestID;
        
        // Update transaction in database
        await supabase
          .from("transactions")
          .update({
            status: "success",
            success_message: successMessage,
            provider_transaction_id: receiptNumber,
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", transaction.id);

        // Update payment status
        await supabase
          .from("payments")
          .update({
            status: "completed",
            mpesa_receipt_number: receiptNumber,
            updated_at: new Date().toISOString()
          })
          .eq("mpesa_checkout_request_id", checkout_request_id);

        // Activate API key - only if payment is actually successful
        await supabase
          .from("api_keys")
          .update({
            payment_status: "completed",
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq("payment_id", transaction.id);

      } else if (queryResult.ResultCode === "1032") {
        // Transaction was cancelled by user
        transactionStatus = "cancelled";
        errorMessage = "Transaction was cancelled by user";
        
        // Update transaction in database
        await supabase
          .from("transactions")
          .update({
            status: "cancelled",
            error_message: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq("id", transaction.id);

        // Update payment status
        await supabase
          .from("payments")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString()
          })
          .eq("mpesa_checkout_request_id", checkout_request_id);

        // Deactivate API key - ensure it's not active
        await supabase
          .from("api_keys")
          .update({
            payment_status: "cancelled",
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq("payment_id", transaction.id);

      } else {
        // Transaction failed for other reasons
        transactionStatus = "failed";
        errorMessage = queryResult.ResultDesc || "Transaction failed";
        
        // Update transaction in database
        await supabase
          .from("transactions")
          .update({
            status: "failed",
            error_message: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq("id", transaction.id);

        // Update payment status
        await supabase
          .from("payments")
          .update({
            status: "failed",
            updated_at: new Date().toISOString()
          })
          .eq("mpesa_checkout_request_id", checkout_request_id);

        // Deactivate API key - ensure it's not active
        await supabase
          .from("api_keys")
          .update({
            payment_status: "failed",
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq("payment_id", transaction.id);
      }
    } else {
      // STK Push Query failed
      console.error("STK Push Query failed:", queryResult);
      transactionStatus = "failed";
      errorMessage = queryResult.errorMessage || "Failed to query transaction status";
    }

    return new Response(
      JSON.stringify({
        success: true,
        transaction: {
          id: transaction.id,
          transaction_id: transaction.transaction_id,
          status: transactionStatus,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          payment_method: transaction.payment_method,
          payment_provider: transaction.payment_provider,
          provider_transaction_id: receiptNumber,
          error_message: errorMessage,
          success_message: successMessage,
          metadata: transaction.metadata,
          created_at: transaction.created_at,
          updated_at: new Date().toISOString(),
          processed_at: transactionStatus === "success" ? new Date().toISOString() : transaction.processed_at,
          expires_at: transaction.expires_at
        },
        mpesa_response: queryResult,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error querying transaction status:", error);
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
