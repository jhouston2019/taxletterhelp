# Admin Mode — Quick Start Guide
## Get Testing in 2 Minutes

---

## Step 1: Set Admin Credentials (1 minute)

**Choose your admin username and password:**
```
Username: admin (or your choice)
Password: [strong password]
```

**Generate admin key:**
```bash
openssl rand -hex 32
```

**Example output:**
```
a7f3c8e9d2b4f6a1c5e8d9b3f7a2c6e4d8b5f9a3c7e1d6b4f8a2c5e9d3b7f6a1
```

Copy these — you'll need them in Step 2.

---

## Step 2: Add to Netlify (1 minute)

1. Go to: **Netlify Dashboard** → **Your Site** → **Site Settings** → **Environment Variables**
2. Click **"Add a variable"** and add these three:
   - **Key**: `ADMIN_USERNAME` | **Value**: Your chosen username
   - **Key**: `ADMIN_PASSWORD` | **Value**: Your chosen password
   - **Key**: `ADMIN_ACCESS_KEY` | **Value**: Your generated key
3. **(Optional)** For production access, add:
   - **Key**: `ENABLE_ADMIN_MODE` | **Value**: `true`

---

## Step 3: Deploy Site (30 seconds)

Netlify will auto-deploy after environment variable change.

Or manually trigger: **Deploys** → **Trigger deploy** → **Deploy site**

---

## Step 4: Test Admin Login (30 seconds)

1. Go to: `https://taxletterhelp.pro/`
2. Scroll to footer
3. Click the subtle **"Admin"** link
4. Enter your username and password
5. Click **"Login"**

**What you should see:**
- ⚠️ Red banner at top: "ADMIN MODE — QA ACCESS ONLY"
- Console log: "[ADMIN MODE ACTIVE]"
- Admin key in URL (then removed)

---

## Step 5: Test Payment Bypass (30 seconds)

Once logged in (admin mode active):
1. Go to: `https://taxletterhelp.pro/payment.html`
2. Click **"Prepare My IRS Response"**
3. Should redirect to `/upload.html` (no Stripe)
4. Console shows: "[ADMIN] Payment bypassed"

✅ **Success!** You're now in admin mode.

---

## Daily Usage

### Activate Admin Mode

1. Go to: `https://taxletterhelp.pro/`
2. Click **"Admin"** link in footer
3. Enter username and password
4. Click **"Login"**

Admin mode persists for your entire browser session.

### Navigate Normally

Once admin mode is active:
- Click any link
- Navigate to any page
- Upload files
- Test full flow

Admin mode stays active until you close the browser.

### Exit Admin Mode

Click **"EXIT ADMIN MODE"** button in red banner.

Or close your browser.

---

## What Admin Mode Does

✅ **Bypasses:**
- Payment checks
- Stripe checkout
- Page access restrictions

✅ **Allows:**
- Direct access to any page
- Full upload/analysis testing
- Success page testing
- Complete flow QA

❌ **Does NOT:**
- Change user experience
- Modify Stripe logic
- Affect pricing
- Alter core intelligence

---

## Security Notes

⚠️ **Keep Your Admin Key Secret:**
- Never commit to Git
- Never share publicly
- Never post in chat/email
- Store in password manager

⚠️ **Admin Mode is Invisible:**
- Normal users cannot discover it
- No UI changes for users
- Only works with valid key
- Session-only (clears on close)

---

## Troubleshooting

### Admin Mode Not Working?

1. **Check Netlify environment variables:**
   - Is `ADMIN_ACCESS_KEY` set?
   - Does it match your key exactly?

2. **Check production lock:**
   - If in production, is `ENABLE_ADMIN_MODE=true`?

3. **Clear browser cache:**
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

4. **Check browser console:**
   - Look for "[ADMIN MODE ACTIVE]" message
   - Check for errors

### Still Not Working?

Check Netlify function logs:
1. Go to: **Netlify Dashboard** → **Functions** → **validate-admin**
2. Look for recent invocations
3. Check for error messages

---

## Quick Reference

### Environment Variables
```
ADMIN_ACCESS_KEY=your-generated-key
ENABLE_ADMIN_MODE=true  # Optional, for production
```

### Activation URL
```
https://taxletterhelp.pro/any-page.html?admin_key=YOUR_KEY
```

### Visual Indicator
```
⚠️ ADMIN MODE — QA ACCESS ONLY — PAYMENT CHECKS BYPASSED  [EXIT]
```

### Console Log
```
[ADMIN MODE ACTIVE]
[ADMIN] Payment check bypassed
[ADMIN] Payment bypassed - redirecting to upload
```

---

## That's It!

You're ready to test the full Tax Letter Help flow without payment.

**For detailed documentation, see:**
- `ADMIN-MODE-GUIDE.md` - Complete guide
- `ADMIN-MODE-IMPLEMENTATION-SUMMARY.md` - Technical details
- `ENV-SETUP.md` - Environment variables

**Happy testing!** 🎯

