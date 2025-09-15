import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MpesaPaymentRequest {
  phone_number: string;
  amount: number;
  duration: string;
  api_key_name: string;
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

    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Invalid user token");
    }

    const { phone_number, amount, duration, api_key_name }: MpesaPaymentRequest = await req.json();

    // Validate required fields
    if (!phone_number || !amount || !duration || !api_key_name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: phone_number, amount, duration, api_key_name"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate amount
    if (amount <= 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Amount must be greater than 0"
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Initiating M-Pesa payment for user ${user.id}, amount: ${amount} KSH`);

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

    if (!tokenResponse.ok) {
      throw new Error(`M-Pesa OAuth failed with status: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error(`Failed to get M-Pesa access token: ${tokenData.error_description || 'Unknown error'}`);
    }

    // Format phone number (ensure it starts with 254)
    let formattedPhone = phone_number.replace(/^\+/, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "254" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("254")) {
      formattedPhone = "254" + formattedPhone;
    }

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").substring(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    // STK Push request
    const stkPushData = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`,
      AccountReference: `API_KEY_${user.id}`,
      TransactionDesc: `Payment for ${duration} API key`,
    };

    const stkResponse = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkPushData),
    });

    if (!stkResponse.ok) {
      throw new Error(`STK Push request failed with status: ${stkResponse.status}`);
    }

    const stkData = await stkResponse.json();
    console.log("STK Push response:", stkData);

    if (stkData.ResponseCode === "0") {
      // Generate unique transaction ID
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      let transactionResult = null;
      let paymentResult = null;
      let apiKeyResult = null;
      
      // Try to create transaction record (non-blocking)
      try {
        const { data: transaction, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            transaction_id: transactionId,
            type: 'payment',
            status: 'pending',
            amount: amount,
            currency: 'KES',
            description: `Payment for ${duration} API key - ${api_key_name}`,
            payment_method: 'mpesa',
            payment_provider: 'safaricom',
            provider_transaction_id: stkData.CheckoutRequestID,
            metadata: {
              duration,
              api_key_name,
              phone_number: formattedPhone,
              checkout_request_id: stkData.CheckoutRequestID
            },
            expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
          })
          .select()
          .single();
        
        if (!transactionError) {
          transactionResult = transaction;
          console.log("Transaction record created successfully");
        } else {
          console.error("Error creating transaction record:", transactionError);
        }
      } catch (error) {
        console.error("Failed to create transaction record:", error);
      }

      // Try to create payment record (non-blocking)
      try {
        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .insert({
            user_id: user.id,
            amount_ksh: amount,
            duration: duration,
            payment_method: "mpesa",
            mpesa_checkout_request_id: stkData.CheckoutRequestID,
            status: "pending",
          })
          .select()
          .single();

        if (!paymentError) {
          paymentResult = payment;
          console.log("Payment record created successfully");
        } else {
          console.error("Error creating payment record:", paymentError);
        }
      } catch (error) {
        console.error("Failed to create payment record:", error);
      }

      // Try to create pending API key (non-blocking)
      try {
        const keyValue = "ztmd_" + btoa(Math.random().toString()).substring(0, 20);
        const { data: apiKey, error: apiKeyError } = await supabase
          .from("api_keys")
          .insert({
            user_id: user.id,
            name: api_key_name,
            key_value: keyValue,
            duration: duration,
            expires_at: await calculateExpirationDate(duration),
            is_trial: false,
            is_active: false, // CRITICAL: API key should be INACTIVE until payment succeeds
            payment_status: "pending",
            payment_id: paymentResult?.id || null,
            price_ksh: amount,
          })
          .select()
          .single();

        if (!apiKeyError) {
          apiKeyResult = apiKey;
          console.log("API key created successfully (inactive until payment succeeds)");
        } else {
          console.error("Error creating API key:", apiKeyError);
        }
      } catch (error) {
        console.error("Failed to create API key:", error);
      }

      // Always return success if STK push was sent successfully
      return new Response(
        JSON.stringify({
          success: true,
          message: "STK push sent successfully",
          checkout_request_id: stkData.CheckoutRequestID,
          payment_id: paymentResult?.id || null,
          api_key_id: apiKeyResult?.id || null,
          transaction_id: transactionId,
          database_status: {
            transaction_created: !!transactionResult,
            payment_created: !!paymentResult,
            api_key_created: !!apiKeyResult
          }
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      // Create failed transaction record
      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      try {
        await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            transaction_id: transactionId,
            type: 'payment',
            status: 'failed',
            amount: amount,
            currency: 'KES',
            description: `Failed payment for ${duration} API key - ${api_key_name}`,
            payment_method: 'mpesa',
            payment_provider: 'safaricom',
            error_message: stkData.errorMessage || "STK push failed",
            metadata: {
              duration,
              api_key_name,
              phone_number: formattedPhone,
              response_code: stkData.ResponseCode
            }
          });
      } catch (error) {
        console.error("Failed to create failed transaction record:", error);
      }

      // Return error response instead of throwing
      return new Response(
        JSON.stringify({
          success: false,
          error: stkData.errorMessage || "STK push failed",
          response_code: stkData.ResponseCode,
          transaction_id: transactionId,
        }),
        {
          status: 400, // Bad Request instead of 500
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in M-Pesa payment:", error);
    
    // Determine appropriate status code based on error type
    let statusCode = 500;
    let errorMessage = error.message;
    
    if (error.message.includes("Missing authorization header") || 
        error.message.includes("Invalid user token")) {
      statusCode = 401; // Unauthorized
    } else if (error.message.includes("Missing Daraja API credentials")) {
      statusCode = 503; // Service Unavailable
    } else if (error.message.includes("Failed to get M-Pesa access token")) {
      statusCode = 503; // Service Unavailable
    } else if (error.message.includes("Failed to create") || 
               error.message.includes("Failed to create transaction record")) {
      statusCode = 500; // Internal Server Error
    }
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        status_code: statusCode
      }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function calculateExpirationDate(duration: string): Promise<string | null> {
  const now = new Date();
  switch (duration) {
    case "1_week":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30_days":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    case "60_days":
      return new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
    case "forever":
      return null;
    default:
      return null;
  }
}

serve(handler);