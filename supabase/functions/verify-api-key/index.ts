import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyApiKeyRequest {
  api_key: string;
}

interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  expires_at: string | null;
  is_active: boolean;
  last_used_at: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { api_key }: VerifyApiKeyRequest = await req.json();

    if (!api_key) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'API key is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Verifying API key:', api_key.substring(0, 10) + '...');

    // Find the API key in the database
    const { data: apiKeyRecord, error: fetchError } = await supabase
      .from('api_keys')
      .select('id, user_id, name, expires_at, is_active, last_used_at')
      .eq('key_value', api_key)
      .single();

    if (fetchError || !apiKeyRecord) {
      console.log('API key not found:', fetchError?.message);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Invalid API key' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const record = apiKeyRecord as ApiKeyRecord;

    // Check if the API key is active
    if (!record.is_active) {
      console.log('API key is inactive');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'API key is inactive' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if the API key has expired
    if (record.expires_at) {
      const expiryDate = new Date(record.expires_at);
      const now = new Date();
      
      if (expiryDate <= now) {
        console.log('API key has expired');
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'API key has expired' 
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Update the last_used_at timestamp
    const { error: updateError } = await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', record.id);

    if (updateError) {
      console.error('Failed to update last_used_at:', updateError.message);
    }

    console.log('API key verified successfully for user:', record.user_id);

    return new Response(
      JSON.stringify({ 
        valid: true,
        user_id: record.user_id,
        key_name: record.name,
        expires_at: record.expires_at
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in verify-api-key function:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});