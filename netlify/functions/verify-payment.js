const { getSupabaseAdmin } = require("./_supabase.js");

/**
 * PAYMENT VERIFICATION FUNCTION
 * 
 * Purpose: Server-side verification that payment was completed
 * Security: Prevents client-side payment bypass
 * 
 * Flow:
 * 1. Client provides Stripe session_id from URL
 * 2. Query database for matching payment record
 * 3. Verify payment status is 'paid'
 * 4. Return verification result
 */

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    console.log('[VERIFY-PAYMENT] Function invoked');
    
    const { sessionId } = JSON.parse(event.body || '{}');
    
    if (!sessionId) {
      console.log('[VERIFY-PAYMENT] No session ID provided');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Session ID required',
          paid: false 
        })
      };
    }
    
    console.log('[VERIFY-PAYMENT] Checking session:', sessionId);
    
    // Query database for payment record
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tlh_letters')
      .select('id, status, user_email, created_at')
      .eq('stripe_session_id', sessionId)
      .maybeSingle();
    
    if (error) {
      console.error('[VERIFY-PAYMENT] Database error:', error);
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          error: 'Database error',
          paid: false 
        })
      };
    }
    
    if (!data) {
      console.log('[VERIFY-PAYMENT] No payment record found for session:', sessionId);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          paid: false,
          message: 'Payment not found or not yet processed'
        })
      };
    }
    
    // Check if payment status is 'paid'
    const isPaid = data.status === 'paid';
    
    console.log('[VERIFY-PAYMENT] Payment record found:', {
      id: data.id,
      status: data.status,
      isPaid: isPaid
    });
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        paid: isPaid,
        recordId: data.id,
        status: data.status,
        userEmail: data.user_email
      })
    };
    
  } catch (error) {
    console.error('[VERIFY-PAYMENT] Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Payment verification failed',
        details: error.message,
        paid: false
      })
    };
  }
};
