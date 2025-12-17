# Environment Variables Setup

## Required Environment Variables

Copy this to your `.env` file or Netlify environment variables.

### Admin Access (QA-Only)

```bash
# Admin login credentials
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-secure-password

# Secret key for operator testing access
# Generate a strong random key: openssl rand -hex 32
# This key is returned after successful login
ADMIN_ACCESS_KEY=your-secret-admin-key-here

# Optional: Enable admin mode in production (default: disabled)
# Set to 'true' only if you need QA access in production
ENABLE_ADMIN_MODE=false
```

### Supabase

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### Stripe

```bash
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
STRIPE_PRICE_RESPONSE=price_xxxxxxxxxxxxx
```

### OpenAI

```bash
OPENAI_API_KEY=your-openai-api-key
```

### Email (Optional)

```bash
SENDGRID_API_KEY=your-sendgrid-api-key
```

### Environment

```bash
NODE_ENV=development
```

---

## Admin Mode Setup

### 1. Generate Admin Key

```bash
# On Mac/Linux:
openssl rand -hex 32

# Or use any strong random string generator
```

### 2. Add to Netlify Environment Variables

1. Go to Netlify Dashboard → Site Settings → Environment Variables
2. Add `ADMIN_ACCESS_KEY` with your generated key
3. (Optional) Add `ENABLE_ADMIN_MODE=true` if testing in production

### 3. Usage

Access any page with the admin key:

```
https://taxletterhelp.pro/upload.html?admin_key=YOUR_SECRET_KEY
```

**Features:**
- Bypasses payment checks
- Allows direct page access
- Shows red admin banner
- Persists for browser session only

### 4. Security Notes

⚠️ **IMPORTANT:**
- Never commit the actual admin key to Git
- Never share the admin key publicly
- Admin mode is disabled in production by default
- Key validation happens server-side only
- Admin session clears on browser close

### 5. Exit Admin Mode

Click "EXIT ADMIN MODE" button in the red banner, or close the browser.

