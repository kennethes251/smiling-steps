# Stripe Quick Setup ⚡

## ✅ Done: Stripe package installed

## What You Need to Do (10 minutes):

### 1. Get Stripe Keys (5 min)
1. Go to https://stripe.com/register
2. Sign up (free, no card needed)
3. Go to Developers → API keys
4. Copy these two keys:
   - Publishable key: `pk_test_...`
   - Secret key: `sk_test_...`

### 2. Add to .env file
```
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
```

### 3. I'll Create the Code
Once you have the keys, I'll create:
- Payment endpoint (backend)
- Payment form (frontend)
- Auto-confirmation

## That's It!

After setup, your flow will be:
1. Client books → Psychologist approves
2. **Payment form appears automatically**
3. Client enters test card: `4242 4242 4242 4242`
4. **Session confirmed instantly** ✨

## Test Cards (Free Forever)
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Any future date, any CVC

Ready? Get your Stripe keys and I'll implement the rest!
