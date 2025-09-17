import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { api_key } = await req.json();

    if (!api_key) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'API key is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Testing API key:', api_key.substring(0, 10) + '...');

    // Query the API key from database
    const { data: keyData, error: keyError } = await supabaseClient
      .from('api_keys')
      .select(`
        id,
        name,
        duration,
        expires_at,
        is_active,
        is_trial,
        created_at,
        last_used_at,
        usage_count,
        price_ksh,
        status,
        paused_until,
        paused_reason,
        admin_notes,
        user_id,
        profiles!inner(email, username)
      `)
      .eq('key_value', api_key)
      .single();

    if (keyError || !keyData) {
      console.log('API key not found:', keyError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'API key not found or invalid',
          exists: false 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if key is expired
    const isExpired = keyData.expires_at && new Date(keyData.expires_at) <= new Date();
    
    // Check if key is paused
    const isPaused = keyData.paused_until && new Date(keyData.paused_until) > new Date();

    // Determine overall status
    let overallStatus = 'active';
    if (!keyData.is_active) {
      overallStatus = 'inactive';
    } else if (isExpired) {
      overallStatus = 'expired';
    } else if (isPaused) {
      overallStatus = 'paused';
    }

    const result = {
      success: true,
      exists: true,
      valid: keyData.is_active && !isExpired && !isPaused,
      api_key_info: {
        id: keyData.id,
        name: keyData.name,
        duration: keyData.duration,
        status: overallStatus,
        is_active: keyData.is_active,
        is_trial: keyData.is_trial,
        is_expired: isExpired,
        is_paused: isPaused,
        expires_at: keyData.expires_at,
        created_at: keyData.created_at,
        last_used_at: keyData.last_used_at,
        usage_count: keyData.usage_count || 0,
        price_ksh: keyData.price_ksh || 0,
        paused_until: keyData.paused_until,
        paused_reason: keyData.paused_reason,
        admin_notes: keyData.admin_notes,
        user: {
          id: keyData.user_id,
          email: keyData.profiles?.email,
          username: keyData.profiles?.username
        }
      }
    };

    console.log('API key test result:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error testing API key:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error',
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});