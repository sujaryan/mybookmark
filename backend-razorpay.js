/**
 * ============================================================
 * mybookmark — Razorpay Subscriptions backend reference
 * ============================================================
 *
 * Node.js + Express reference implementation for:
 *   1. Creating plans (one-time setup)
 *   2. Creating subscriptions (called from frontend when user clicks Subscribe)
 *   3. Verifying payment + signature (after Razorpay Checkout completes)
 *   4. Handling webhooks (subscription lifecycle events)
 *   5. Pausing / cancelling subscriptions from your admin dashboard
 *
 * --------------------------------------------
 * QUICK START
 * --------------------------------------------
 *   1. npm init -y
 *   2. npm install express razorpay body-parser dotenv crypto
 *   3. Create a .env file with:
 *        RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
 *        RAZORPAY_KEY_SECRET=your_secret_key_here
 *        RAZORPAY_WEBHOOK_SECRET=webhook_secret_from_dashboard
 *        PORT=3000
 *   4. Run plan creation ONCE: `node backend-razorpay.js --create-plans`
 *      Copy the returned plan IDs into PLAN_IDS below and into the frontend.
 *   5. Start the server: `node backend-razorpay.js`
 *   6. Expose it via HTTPS (use ngrok during dev, your hosting in prod).
 *   7. Register the webhook URL in Razorpay dashboard:
 *        https://your-domain.com/api/razorpay/webhook
 *      Subscribe to events: subscription.activated, subscription.charged,
 *        subscription.completed, subscription.paused, subscription.cancelled,
 *        payment.failed
 *
 * --------------------------------------------
 * RAZORPAY SUBSCRIPTIONS — HOW IT WORKS
 * --------------------------------------------
 * Razorpay Subscriptions auto-debit recurring payments via:
 *   - UPI Autopay (most popular in India)
 *   - Card mandate (e-mandate)
 *   - eNACH (bank mandate)
 *
 * Each subscription is tied to a "plan" (amount + period).
 *   - monthly: period='monthly', interval=1
 *   - half-yearly (5+1, charged every 6 months): period='monthly', interval=6
 *   - yearly (10+2, charged every 12 months): period='yearly', interval=1
 *
 * The "5+1" and "10+2" pricing means we charge for fewer months but the
 * subscription cycle gives the member that long of access. So the *amount*
 * per period is total = monthly_rate × charged_months.
 *   - Reader half-yearly: ₹549 × 5 = ₹2,745 charged every 6 months
 *   - Reader yearly: ₹549 × 10 = ₹5,490 charged every 12 months
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json({
  // Save raw body for webhook signature verification
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ============================================================
// PLAN CONFIG
// ============================================================
// Monthly rate per tier (in INR)
const MONTHLY_RATE = {
  Kids: 249,
  Reader: 549,
  Bookworm: 849
};

// Months charged per billing cycle (the "5+1" / "10+2" model)
//   monthly: charge for 1 month, give 1 month
//   half:    charge for 5 months, give 6 months (1 month free)
//   yearly:  charge for 10 months, give 12 months (2 months free)
const PERIOD_CONFIG = {
  monthly: { period: 'monthly', interval: 1, chargedMonths: 1, accessMonths: 1 },
  half:    { period: 'monthly', interval: 6, chargedMonths: 5, accessMonths: 6 },
  yearly:  { period: 'yearly',  interval: 1, chargedMonths: 10, accessMonths: 12 }
};

// Filled in after running `node backend-razorpay.js --create-plans`
// Plan IDs returned by Razorpay (format: plan_xxxxxxxxxxxxxx)
const PLAN_IDS = {
  Kids:     { monthly: 'plan_REPLACE', half: 'plan_REPLACE', yearly: 'plan_REPLACE' },
  Reader:   { monthly: 'plan_REPLACE', half: 'plan_REPLACE', yearly: 'plan_REPLACE' },
  Bookworm: { monthly: 'plan_REPLACE', half: 'plan_REPLACE', yearly: 'plan_REPLACE' }
};

// Deposit amounts per tier (collected as separate one-time payment alongside first subscription charge)
const DEPOSITS = { Kids: 400, Reader: 1000, Bookworm: 1500 };

// ============================================================
// ONE-TIME: CREATE PLANS
// Run with: node backend-razorpay.js --create-plans
// ============================================================
async function createPlans() {
  const created = {};
  for (const plan of Object.keys(MONTHLY_RATE)) {
    created[plan] = {};
    for (const period of Object.keys(PERIOD_CONFIG)) {
      const cfg = PERIOD_CONFIG[period];
      const amount = MONTHLY_RATE[plan] * cfg.chargedMonths * 100; // Razorpay expects paise

      const planObj = await razorpay.plans.create({
        period: cfg.period,
        interval: cfg.interval,
        item: {
          name: `${plan} — ${period}`,
          amount: amount,
          currency: 'INR',
          description: `mybookmark ${plan} plan, billed ${period === 'monthly' ? 'monthly' : period === 'half' ? 'every 6 months' : 'yearly'}`
        }
      });
      created[plan][period] = planObj.id;
      console.log(`Created ${plan} ${period}: ${planObj.id} (₹${amount / 100})`);
    }
  }
  console.log('\nCopy these into PLAN_IDS:\n', JSON.stringify(created, null, 2));
  return created;
}

// ============================================================
// API: Create a subscription for a member
// Frontend calls this when user clicks "Subscribe"
// ============================================================
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { plan, period, member_email, member_name, member_phone } = req.body;

    if (!PLAN_IDS[plan] || !PLAN_IDS[plan][period]) {
      return res.status(400).json({ error: 'Invalid plan or period' });
    }
    const planId = PLAN_IDS[plan][period];

    // Total billing cycles. Set high enough to be effectively perpetual.
    // For monthly subscriptions, 120 = 10 years. Razorpay caps at this scale.
    // For yearly, 10 cycles = 10 years. Adjust to your business model.
    const totalCount = period === 'yearly' ? 10 : 120;

    const subscription = await razorpay.subscriptions.create({
      plan_id: planId,
      customer_notify: 1,
      quantity: 1,
      total_count: totalCount,
      // Pass internal metadata that you'll receive back in webhooks
      notes: {
        plan_name: plan,
        billing_period: period,
        member_email: member_email,
        member_name: member_name,
        member_phone: member_phone
      },
      // The deposit is collected as a separate addon on the first charge
      addons: [{
        item: {
          name: `${plan} refundable security deposit`,
          amount: DEPOSITS[plan] * 100, // paise
          currency: 'INR'
        }
      }]
    });

    // Save subscription_id in your DB linked to this member
    // await db.members.update({ email: member_email }, { razorpay_subscription_id: subscription.id });

    res.json({
      subscription_id: subscription.id,
      key_id: process.env.RAZORPAY_KEY_ID,
      status: subscription.status
    });
  } catch (err) {
    console.error('create-subscription error:', err);
    res.status(500).json({ error: err.error?.description || err.message });
  }
});

// ============================================================
// API: Verify payment signature
// Frontend calls this after Razorpay Checkout success handler
// ============================================================
app.post('/api/verify-subscription', (req, res) => {
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    // Signature is valid — mark member as paid in your DB
    // await db.members.update({ razorpay_subscription_id }, { status: 'active', paid_at: new Date() });
    res.json({ verified: true });
  } else {
    res.status(400).json({ verified: false, error: 'Signature mismatch' });
  }
});

// ============================================================
// API: Webhook handler
// Razorpay sends events here — register this URL in dashboard:
//   https://your-domain.com/api/razorpay/webhook
// ============================================================
app.post('/api/razorpay/webhook', (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(req.rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.warn('Webhook signature mismatch');
    return res.status(400).send('Invalid signature');
  }

  const event = req.body.event;
  const payload = req.body.payload;
  console.log('Webhook event:', event);

  // Handle each event type
  switch (event) {
    case 'subscription.activated':
      // First payment captured. Member is officially active.
      // payload.subscription.entity.id, .notes.member_email, .current_start, .current_end
      handleSubscriptionActivated(payload.subscription.entity);
      break;

    case 'subscription.charged':
      // Recurring payment captured. Extend access, send receipt.
      handleSubscriptionCharged(payload.subscription.entity, payload.payment.entity);
      break;

    case 'subscription.paused':
      // Member or admin paused. Stop deliveries.
      handleSubscriptionPaused(payload.subscription.entity);
      break;

    case 'subscription.resumed':
      handleSubscriptionResumed(payload.subscription.entity);
      break;

    case 'subscription.cancelled':
      // Cancelled. Refund deposit after final book audit.
      handleSubscriptionCancelled(payload.subscription.entity);
      break;

    case 'subscription.completed':
      // total_count reached. Time to offer renewal.
      handleSubscriptionCompleted(payload.subscription.entity);
      break;

    case 'payment.failed':
      // Auto-debit failed. Send dunning email/WhatsApp.
      handlePaymentFailed(payload.payment.entity);
      break;

    case 'subscription.halted':
      // Razorpay halted the subscription after repeated failures (~3 retries).
      handleSubscriptionHalted(payload.subscription.entity);
      break;
  }

  res.status(200).send('ok');
});

// Webhook handler stubs — wire these to your DB / notification system
function handleSubscriptionActivated(sub) {
  console.log(`Activated: ${sub.notes.member_email} on ${sub.notes.plan_name}`);
  // await db.members.update({ razorpay_subscription_id: sub.id }, { status: 'active', activated_at: new Date() });
  // await whatsapp.send(sub.notes.member_phone, `Welcome to mybookmark! Your first books arrive within 48h.`);
}

function handleSubscriptionCharged(sub, payment) {
  console.log(`Charged ₹${payment.amount / 100} for ${sub.notes.member_email}`);
  // await db.payments.insert({ subscription_id: sub.id, amount: payment.amount, paid_at: new Date() });
}

function handleSubscriptionPaused(sub) {
  // await db.members.update({ razorpay_subscription_id: sub.id }, { status: 'paused' });
}

function handleSubscriptionResumed(sub) {
  // await db.members.update({ razorpay_subscription_id: sub.id }, { status: 'active' });
}

function handleSubscriptionCancelled(sub) {
  // await db.members.update({ razorpay_subscription_id: sub.id }, { status: 'cancelled', cancelled_at: new Date() });
  // Queue: audit returned books, then refund deposit via Razorpay refunds API
}

function handleSubscriptionCompleted(sub) {
  // await renewalReminder.send(sub.notes.member_email);
}

function handlePaymentFailed(payment) {
  // await dunning.send(payment.email, payment.contact);
}

function handleSubscriptionHalted(sub) {
  // await db.members.update({ razorpay_subscription_id: sub.id }, { status: 'halted' });
  // Notify member to update payment method
}

// ============================================================
// API: Pause / resume / cancel subscription
// Called from your admin dashboard
// ============================================================
app.post('/api/subscription/:id/pause', async (req, res) => {
  try {
    const result = await razorpay.subscriptions.pause(req.params.id, { pause_at: 'now' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.error?.description || err.message });
  }
});

app.post('/api/subscription/:id/resume', async (req, res) => {
  try {
    const result = await razorpay.subscriptions.resume(req.params.id, { resume_at: 'now' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.error?.description || err.message });
  }
});

app.post('/api/subscription/:id/cancel', async (req, res) => {
  try {
    // cancel_at_cycle_end: true means member keeps access till current cycle ends
    const result = await razorpay.subscriptions.cancel(req.params.id, true);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.error?.description || err.message });
  }
});

// ============================================================
// API: Refund deposit (when member cancels after returning books)
// ============================================================
app.post('/api/refund-deposit', async (req, res) => {
  try {
    const { payment_id, amount_inr, notes } = req.body;
    const refund = await razorpay.payments.refund(payment_id, {
      amount: amount_inr * 100, // paise
      speed: 'normal',
      notes: notes
    });
    res.json(refund);
  } catch (err) {
    res.status(500).json({ error: err.error?.description || err.message });
  }
});

// ============================================================
// Start server (or run plan creation if --create-plans flag)
// ============================================================
const PORT = process.env.PORT || 3000;

if (process.argv.includes('--create-plans')) {
  createPlans()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
} else {
  app.listen(PORT, () => console.log(`mybookmark backend listening on :${PORT}`));
}

// ============================================================
// REFERENCE: Frontend integration
// ============================================================
// Your frontend (index.html) calls /api/create-subscription, then opens
// Razorpay Checkout with the returned subscription_id:
//
//   const res = await fetch('/api/create-subscription', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({
//       plan: 'Reader',
//       period: 'monthly',
//       member_email: 'user@example.com',
//       member_name: 'Priya Sharma',
//       member_phone: '+91 98765 43210'
//     })
//   });
//   const { subscription_id, key_id } = await res.json();
//
//   const rzp = new Razorpay({
//     key: key_id,
//     subscription_id: subscription_id,
//     name: 'mybookmark',
//     description: 'Reader plan (monthly)',
//     image: 'https://mybookmark.in/logo.png',
//     theme: { color: '#b8552b' },
//     handler: async function(response) {
//       // Verify on backend
//       const v = await fetch('/api/verify-subscription', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(response)
//       });
//       const { verified } = await v.json();
//       if (verified) window.location.href = '/dashboard';
//       else alert('Payment verification failed. Contact support.');
//     },
//     prefill: {
//       name: 'Priya Sharma',
//       email: 'user@example.com',
//       contact: '+919876543210'
//     },
//     modal: {
//       ondismiss: function() { console.log('Checkout dismissed'); }
//     }
//   });
//   rzp.open();
// ============================================================
