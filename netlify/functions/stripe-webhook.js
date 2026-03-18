const Stripe = require("stripe");
const { getSupabaseAdmin } = require("./_supabase.js");
const { wrapHandler, trackError, trackEvent } = require('./_error-tracking.js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const mainHandler = async (event) => {
  try {
    const sig = event.headers["stripe-signature"];
    const rawBody = event.isBase64Encoded ? Buffer.from(event.body, "base64") : Buffer.from(event.body || "");
    let evt;

    try {
      evt = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    if (evt.type === "checkout.session.completed") {
      const session = evt.data.object;
      
      console.log('[WEBHOOK] Processing checkout.session.completed:', session.id);
      console.log('[WEBHOOK] Payment status:', session.payment_status);
      console.log('[WEBHOOK] Customer email:', session.customer_email || session.customer_details?.email);
      
      // Only process if payment was successful
      if (session.payment_status !== 'paid') {
        console.log('[WEBHOOK] Payment not completed yet, skipping');
        return { statusCode: 200, body: 'Payment not yet completed' };
      }
      
      const supabase = getSupabaseAdmin();
      
      // Check if record already exists
      const { data: existing, error: queryError } = await supabase
        .from('tlh_letters')
        .select('id, status')
        .eq('stripe_session_id', session.id)
        .maybeSingle();
      
      if (queryError) {
        console.error('[WEBHOOK] Database query error:', queryError);
      }
      
      if (existing) {
        // Update existing record
        console.log('[WEBHOOK] Updating existing record:', existing.id);
        const { error: updateError } = await supabase
          .from('tlh_letters')
          .update({
            status: 'paid',
            stripe_customer_id: session.customer,
            user_email: session.customer_email || session.customer_details?.email || existing.user_email,
            price_id: session.metadata?.price_id || process.env.STRIPE_PRICE_RESPONSE
          })
          .eq('id', existing.id);
        
        if (updateError) {
          console.error('[WEBHOOK] Database update error:', updateError);
        } else {
          console.log('[WEBHOOK] Payment record updated successfully');
        }
      } else {
        // Create new record
        console.log('[WEBHOOK] Creating new payment record');
        const { data: newRecord, error: insertError } = await supabase
          .from('tlh_letters')
          .insert({
            stripe_session_id: session.id,
            stripe_customer_id: session.customer,
            user_email: session.customer_email || session.customer_details?.email,
            price_id: session.metadata?.price_id || process.env.STRIPE_PRICE_RESPONSE,
            letter_text: 'Pending upload',
            status: 'paid'
          })
          .select('id')
          .single();
        
        if (insertError) {
          console.error('[WEBHOOK] Database insert error:', insertError);
          trackError(insertError, { functionName: 'stripe-webhook', action: 'insert_payment' });
        } else {
          console.log('[WEBHOOK] Payment record created:', newRecord.id);
          trackEvent('payment_completed', { 
            sessionId: session.id,
            amount: session.amount_total / 100,
            recordId: newRecord.id
          });
        }
      }
    }

    return { statusCode: 200, body: "ok" };
  } catch (e) {
    trackError(e, { functionName: 'stripe-webhook' });
    return { statusCode: 500, body: e.message };
  }
};

exports.handler = wrapHandler(mainHandler, 'stripe-webhook');