/**
 * PAYMENT VERIFICATION FUNCTION - Day 2 Critical
 * 
 * This function verifies that a Stripe checkout session resulted in a successful payment
 * by checking the database for a record with the given session ID and 'paid' status.
 * 
 * Called by: thank-you.html, upload.html
 * 
 * Security: Server-side verification prevents payment bypass
 */

const { getSupabaseAdmin } = require('./_supabase.js');
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
    const { sessionId } = JSON.parse(event.body || '{}');
    
    if (!sessionId) {
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

    console.log('Verifying payment for session:', sessionId);

    // Step 1: Verify with Stripe directly (most authoritative)
    let stripeSession;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
      console.log('Stripe session status:', stripeSession.payment_status);
    } catch (stripeError) {
      console.error('Stripe session retrieval error:', stripeError);
      // Continue to database check - webhook may have processed it
    }

    // Step 2: Check database for payment record
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('tlh_letters')
      .select('id, status, user_email, created_at')
      .eq('stripe_session_id', sessionId)
      .single();
    
    if (error) {
      console.error('Database query error:', error);
      
      // If no record exists but Stripe says paid, create one
      if (stripeSession && stripeSession.payment_status === 'paid') {
        console.log('Creating payment record from Stripe session');
        
        const { data: newRecord, error: insertError } = await supabase
          .from('tlh_letters')
          .insert({
            stripe_session_id: sessionId,
            stripe_customer_id: stripeSession.customer,
            user_email: stripeSession.customer_email || stripeSession.customer_details?.email,
            price_id: stripeSession.metadata?.price_id || process.env.STRIPE_PRICE_RESPONSE,
            letter_text: 'Pending upload',
            status: 'paid'
          })
          .select('id')
          .single();
        
        if (insertError) {
          console.error('Failed to create payment record:', insertError);
          return {
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
              error: 'Payment verification failed',
              paid: false 
            })
          };
        }
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ 
            paid: true,
            recordId: newRecord.id,
            message: 'Payment verified and record created'
          })
        };
      }
      
      // No record and no Stripe confirmation
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          paid: false,
          message: 'Payment record not found'
        })
      };
    }
    
    // Step 3: Verify payment status
    const isPaid = data.status === 'paid' || 
                   data.status === 'analyzed' || 
                   data.status === 'responded' || 
                   data.status === 'completed';
    
    if (!isPaid) {
      console.log('Payment record exists but status is:', data.status);
      
      // If Stripe says paid but our record doesn't, update it
      if (stripeSession && stripeSession.payment_status === 'paid') {
        console.log('Updating payment status from Stripe');
        
        const { error: updateError } = await supabase
          .from('tlh_letters')
          .update({ status: 'paid' })
          .eq('id', data.id);
        
        if (updateError) {
          console.error('Failed to update payment status:', updateError);
        } else {
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
              paid: true,
              recordId: data.id,
              message: 'Payment status updated'
            })
          };
        }
      }
    }
    
    // Step 4: Return verification result
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        paid: isPaid,
        recordId: isPaid ? data.id : null,
        message: isPaid ? 'Payment verified' : 'Payment pending'
      })
    };
    
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        paid: false
      })
    };
  }
};
