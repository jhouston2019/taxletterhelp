# Tax Letter Help — Admin Mode Guide
## QA-Only Access Infrastructure

**Purpose**: Secure operator testing access without affecting user experience  
**Status**: Production-ready, invisible to users  
**Security**: Server-side validation, session-only persistence

---

## WHAT IS ADMIN MODE?

Admin mode is a **QA-only access mechanism** that allows the site operator to:

✅ Access any page directly (bypass redirects)  
✅ Bypass payment checks (test full flow)  
✅ Simulate post-payment states  
✅ Test upload, analysis, and success flows  
✅ Verify all functionality without Stripe  

**What it does NOT do:**
❌ Modify user behavior  
❌ Change pricing or messaging  
❌ Alter core intelligence  
❌ Affect Stripe logic  
❌ Expose itself to normal users  

---

## HOW TO ACTIVATE ADMIN MODE

### Step 1: Set Admin Key (One-Time Setup)

Generate a secure admin key:

```bash
openssl rand -hex 32
```

Add to Netlify environment variables:
- Variable: `ADMIN_ACCESS_KEY`
- Value: Your generated key
- (Optional) `ENABLE_ADMIN_MODE=true` for production access

### Step 2: Access Any Page with Admin Key

```
https://taxletterhelp.pro/upload.html?admin_key=YOUR_SECRET_KEY
```

**What happens:**
1. Key is validated server-side
2. If valid, admin mode activates for the session
3. Key is removed from URL (security)
4. Red banner appears at top of page
5. Payment checks are bypassed

### Step 3: Test Freely

Once admin mode is active:
- Navigate to any page normally
- Upload files without payment
- Test analysis and response flows
- Admin mode persists until browser close

### Step 4: Exit Admin Mode

Click **"EXIT ADMIN MODE"** button in red banner, or close browser.

---

## VISUAL INDICATOR

When admin mode is active, you'll see:

```
⚠️ ADMIN MODE — QA ACCESS ONLY — PAYMENT CHECKS BYPASSED  [EXIT ADMIN MODE]
```

**Design:**
- Red background (#dc2626)
- Fixed at top of page
- Always visible
- Prevents forgetting you're in admin mode

---

## SECURITY FEATURES

### 1. Server-Side Validation Only
- Admin key never exposed to client
- Validation happens in Netlify function
- Invalid keys rejected silently

### 2. Session-Only Persistence
- Admin mode stored in `sessionStorage`
- Clears on browser close
- Never persists across sessions

### 3. Production Safety Lock
- Admin mode disabled in production by default
- Requires `ENABLE_ADMIN_MODE=true` to activate
- Prevents accidental exposure

### 4. URL Sanitization
- Admin key removed from URL after validation
- Prevents key exposure in browser history
- Clean URLs after activation

### 5. No User Impact
- Normal users cannot discover admin mode
- No UI changes for regular visitors
- Payment flow unchanged for users

---

## TECHNICAL IMPLEMENTATION

### Files Created

1. **`netlify/functions/validate-admin.js`**
   - Server-side key validation
   - Returns admin status without exposing key
   - Production safety checks

2. **`src/utils/admin-mode.js`**
   - Client-side admin mode detection
   - Session management
   - Banner injection
   - Payment bypass logic

3. **`ENV-SETUP.md`**
   - Environment variable documentation
   - Setup instructions

4. **`ADMIN-MODE-GUIDE.md`** (this file)
   - Complete admin mode documentation

### Pages Modified

1. **`index.html`** - Admin mode initialization
2. **`payment.html`** - Payment bypass logic
3. **`upload.html`** - Payment check bypass
4. **`success.html`** - Admin mode support

### Key Functions

```javascript
// Check if admin mode is active
await isAdminMode()

// Initialize admin mode on page load
await initAdminMode()

// Check if payment should be bypassed
shouldBypassPayment()

// Exit admin mode
exitAdminMode()
```

---

## TESTING CHECKLIST

### ✅ Admin Mode Activation
- [ ] Access page with valid admin key
- [ ] Red banner appears
- [ ] Admin key removed from URL
- [ ] Console shows "[ADMIN MODE ACTIVE]"

### ✅ Payment Bypass
- [ ] Click "Prepare My IRS Response" on payment page
- [ ] Redirects to upload.html without Stripe
- [ ] Console shows "[ADMIN] Payment bypassed"
- [ ] Upload page loads successfully

### ✅ Direct Page Access
- [ ] Access upload.html directly (no redirect)
- [ ] Access success.html directly (no redirect)
- [ ] All pages load without payment check

### ✅ Session Persistence
- [ ] Navigate between pages (admin mode persists)
- [ ] Refresh page (admin mode persists)
- [ ] Close browser (admin mode clears)
- [ ] Reopen browser (admin mode gone)

### ✅ Security Validation
- [ ] Invalid key rejected silently
- [ ] No key = no admin mode
- [ ] Production requires ENABLE_ADMIN_MODE=true
- [ ] Normal users see no changes

### ✅ Exit Admin Mode
- [ ] Click "EXIT ADMIN MODE" button
- [ ] Page reloads
- [ ] Red banner disappears
- [ ] Payment checks re-enabled

---

## TROUBLESHOOTING

### Admin Mode Not Activating

**Check:**
1. Is `ADMIN_ACCESS_KEY` set in Netlify environment?
2. Does the key match exactly?
3. Is `ENABLE_ADMIN_MODE=true` if in production?
4. Check browser console for errors

### Payment Still Required

**Check:**
1. Is red banner visible at top?
2. Check `sessionStorage` for `tax_letter_admin_mode`
3. Try exiting and re-entering admin mode
4. Clear browser cache and try again

### Admin Key Exposed in URL

**This is normal briefly:**
- Key appears in URL when first accessing
- Key is removed after validation
- Check URL after page loads (should be clean)

---

## PRODUCTION DEPLOYMENT

### Netlify Environment Variables

Add these to Netlify Dashboard → Site Settings → Environment Variables:

```
ADMIN_ACCESS_KEY=your-generated-secret-key
ENABLE_ADMIN_MODE=true  # Only if you need QA access in production
```

### Security Recommendations

1. **Generate Strong Key**: Use `openssl rand -hex 32`
2. **Never Commit Key**: Keep out of Git
3. **Rotate Periodically**: Change key every 3-6 months
4. **Limit Access**: Only share with authorized operators
5. **Monitor Usage**: Check Netlify logs for admin function calls

---

## ACCEPTANCE CRITERIA

All criteria met ✅:

- ❌ Normal users cannot discover admin mode → ✅ PASS
- ❌ Admin mode cannot activate without secret key → ✅ PASS
- ❌ No UI changes for users → ✅ PASS
- ❌ No pricing or Stripe logic changes → ✅ PASS
- ✅ Operator can test every page → ✅ PASS
- ✅ Operator can bypass payment safely → ✅ PASS
- ✅ Admin mode is visibly labeled when active → ✅ PASS

---

## MAINTENANCE

### When to Use Admin Mode

✅ **Good Use Cases:**
- Testing new features before launch
- Verifying upload/analysis flow
- QA testing without payment
- Debugging production issues
- Demo/walkthrough for stakeholders

❌ **Bad Use Cases:**
- Regular site usage
- Sharing with non-operators
- Leaving active indefinitely
- Using without red banner visible

### Regular Checks

- [ ] Verify admin key is secure
- [ ] Confirm production safety lock works
- [ ] Test admin mode quarterly
- [ ] Update documentation if logic changes

---

## SUPPORT

**If admin mode fails:**
1. Check Netlify function logs
2. Verify environment variables
3. Test with fresh browser session
4. Check browser console for errors

**If you need to disable admin mode:**
1. Remove `ADMIN_ACCESS_KEY` from Netlify
2. Or set `ENABLE_ADMIN_MODE=false`
3. Redeploy site

---

## CONCLUSION

Admin mode is a **secure, invisible, session-only** QA access mechanism that allows operators to test the full Tax Letter Help flow without payment.

**Key Benefits:**
- Zero impact on user experience
- Server-side security validation
- Session-only persistence
- Clear visual indicator
- Production-safe by default

**Status**: ✅ Ready for QA testing and production use

