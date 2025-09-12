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

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      throw new Error("Failed to get M-Pesa access token");
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

    const stkData = await stkResponse.json();
    console.log("STK Push response:", stkData);

    if (stkData.ResponseCode === "0") {
      // Create payment record
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

      if (paymentError) {
        console.error("Error creating payment record:", paymentError);
        throw new Error("Failed to create payment record");
      }

      // Create pending API key
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
          payment_status: "pending",
          payment_id: payment.id,
          price_ksh: amount,
        })
        .select()
        .single();

      if (apiKeyError) {
        console.error("Error creating API key:", apiKeyError);
        throw new Error("Failed to create API key");
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "STK push sent successfully",
          checkout_request_id: stkData.CheckoutRequestID,
          payment_id: payment.id,
          api_key_id: apiKey.id,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    } else {
      throw new Error(stkData.errorMessage || "STK push failed");
    }
  } catch (error: any) {
    console.error("Error in M-Pesa payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
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