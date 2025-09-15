// Test script for M-Pesa payment function
// Run this in your browser console or Node.js environment

const SUPABASE_URL = 'https://gqvqvsbpszgbottgtcrf.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here'; // Replace with your actual anon key

async function testMpesaPayment() {
  try {
    // First, you need to authenticate and get a session token
    // This is just a test structure - you'll need to implement proper auth
    
    const response = await fetch(`${SUPABASE_URL}/functions/v1/mpesa-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, // This should be a valid session token
      },
      body: JSON.stringify({
        phone_number: '254712345678',
        amount: 100,
        duration: '1_week',
        api_key_name: 'Test API Key'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok) {
      console.log('✅ Function call successful');
    } else {
      console.log('❌ Function call failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Uncomment to run the test
// testMpesaPayment();
