import Stripe from "stripe";
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function handler(event) {
  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid signature' })
    };
  }

  try {
    switch (stripeEvent.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(stripeEvent.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object);
        break;
      
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripeEvent.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(stripeEvent.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    console.error('Webhook handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Webhook handler failed' })
    };
  }
}

async function handleSubscriptionCreated(subscription) {
  const { customer, id, status, current_period_start, current_period_end, items } = subscription;
  
  // Get user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customer)
    .single();

  if (!user) {
    console.error('User not found for customer:', customer);
    return;
  }

  // Get plan type from price ID
  const priceId = items.data[0].price.id;
  const planType = getPlanTypeFromPriceId(priceId);

  // Create subscription record
  await supabase
    .from('subscriptions')
    .insert({
      user_id: user.id,
      stripe_customer_id: customer,
      stripe_subscription_id: id,
      plan_type: planType,
      status: status,
      current_period_start: new Date(current_period_start * 1000),
      current_period_end: new Date(current_period_end * 1000)
    });
}

async function handleSubscriptionUpdated(subscription) {
  const { id, status, current_period_start, current_period_end } = subscription;
  
  await supabase
    .from('subscriptions')
    .update({
      status: status,
      current_period_start: new Date(current_period_start * 1000),
      current_period_end: new Date(current_period_end * 1000),
      updated_at: new Date()
    })
    .eq('stripe_subscription_id', id);
}

async function handleSubscriptionDeleted(subscription) {
  const { id } = subscription;
  
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      updated_at: new Date()
    })
    .eq('stripe_subscription_id', id);
}

async function handleCheckoutCompleted(session) {
  const { customer, subscription, metadata } = session;
  
  if (subscription) {
    // This is a subscription checkout
    return; // Will be handled by subscription.created event
  }
  
  // This is a one-time payment
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customer)
    .single();

  if (!user) return;

  const planType = metadata?.plan || 'STANDARD';
  
  // Create a one-time subscription record
  await supabase
    .from('subscriptions')
    .insert({
      user_id: user.id,
      stripe_customer_id: customer,
      plan_type: planType,
      status: 'active',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    });
}

async function handlePaymentSucceeded(invoice) {
  const { subscription, customer } = invoice;
  
  if (subscription) {
    // Update subscription status
    await supabase
      .from('subscriptions')
      .update({ status: 'active' })
      .eq('stripe_subscription_id', subscription);
  }
}

async function handlePaymentFailed(invoice) {
  const { subscription, customer } = invoice;
  
  if (subscription) {
    // Update subscription status
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due' })
      .eq('stripe_subscription_id', subscription);
  }
}

function getPlanTypeFromPriceId(priceId) {
  const priceMap = {
    [process.env.STRIPE_PRICE_STANDARD]: 'STANDARD',
    [process.env.STRIPE_PRICE_COMPLEX]: 'COMPLEX',
    [process.env.STRIPE_PRICE_STARTER]: 'STARTER',
    [process.env.STRIPE_PRICE_PRO]: 'PRO',
    [process.env.STRIPE_PRICE_PROPLUS]: 'PROPLUS'
  };
  
  return priceMap[priceId] || 'STANDARD';
}
