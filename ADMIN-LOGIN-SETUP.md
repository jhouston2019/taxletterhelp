# Admin Login Setup Guide
## Secure Username + Password Access

---

## WHAT CHANGED

Admin access now requires **username + password login** instead of just a key prompt.

### **Before:**
- Click "Admin" → Enter key → Access granted

### **After:**
- Click "Admin" → Enter username & password → System validates → Admin key returned → Access granted

---

## SETUP (3 MINUTES)

### Step 1: Set Three Environment Variables

Go to: **Netlify Dashboard** → **Site Settings** → **Environment Variables**

Add these three variables:

```
ADMIN_USERNAME=your-username-here
ADMIN_PASSWORD=your-secure-password-here
ADMIN_ACCESS_KEY=generate-with-openssl-rand-hex-32
```

### Step 2: Generate Admin Key

```bash
openssl rand -hex 32
```

Use the output as your `ADMIN_ACCESS_KEY` value.

### Step 3: Deploy

Netlify will auto-deploy after environment variable changes.

---

## HOW TO USE

### 1. Access Admin Login

- Go to: `https://taxletterhelp.pro/`
- Scroll to footer
- Click subtle **"Admin"** link (next to Privacy/Terms/Disclaimer)

### 2. Enter Credentials

A modal will appear:
- **Username**: Enter your `ADMIN_USERNAME`
- **Password**: Enter your `ADMIN_PASSWORD`
- Click **"Login"**

### 3. Admin Mode Activates

If credentials are valid:
- ✅ Modal closes
- ✅ Page redirects with admin key
- ✅ Red banner appears: "ADMIN MODE — QA ACCESS ONLY"
- ✅ Payment checks bypassed
- ✅ Full site access enabled

If credentials are invalid:
- ❌ Error message: "Invalid username or password"
- ❌ Password field cleared
- ❌ Try again

---

## SECURITY FEATURES

### Two-Layer Protection
1. **Username + Password** (first layer)
2. **Admin Key** (second layer, returned after login)

### Server-Side Validation
- All validation happens in Netlify function
- Credentials never exposed to client
- Admin key only returned on successful login

### Session-Only Storage
- Admin mode stored in `sessionStorage`
- Clears on browser close
- No permanent admin state

### Failed Login Protection
- Invalid attempts don't reveal key
- Error messages are generic
- No rate limiting needed (server-side validation is slow enough)

---

## ENVIRONMENT VARIABLES REQUIRED

```bash
# Admin login credentials
ADMIN_USERNAME=your-username-here
ADMIN_PASSWORD=your-secure-password-here

# Admin access key (returned after successful login)
ADMIN_ACCESS_KEY=your-generated-key-here

# Optional: Enable in production
ENABLE_ADMIN_MODE=true
```

---

## TROUBLESHOOTING

### Login Not Working?

1. **Check Netlify environment variables:**
   - Is `ADMIN_USERNAME` set?
   - Is `ADMIN_PASSWORD` set?
   - Is `ADMIN_ACCESS_KEY` set?
   - Do they match exactly? (case-sensitive)

2. **Check production lock:**
   - If in production, is `ENABLE_ADMIN_MODE=true`?

3. **Check browser console:**
   - Look for network errors
   - Check validate-admin function response

### Modal Not Appearing?

1. Clear browser cache
2. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Check if "Admin" link is visible in footer

### "Invalid username or password" Error?

- Double-check your credentials
- Verify environment variables in Netlify
- Ensure no extra spaces in env vars
- Try redeploying site

---

## RECOMMENDED CREDENTIALS

### Username
- Simple and memorable
- Examples: `admin`, `operator`, `qa`

### Password
- Strong and secure
- Minimum 16 characters
- Mix of letters, numbers, symbols
- Use a password manager

### Admin Key
- Always generate with: `openssl rand -hex 32`
- 64 characters (256-bit security)
- Never reuse keys

---

## MIGRATION FROM OLD SYSTEM

If you were using the old prompt-based system:

1. **Set new environment variables** (username + password)
2. **Keep existing `ADMIN_ACCESS_KEY`** (no need to change)
3. **Deploy site**
4. **Test login with new credentials**

The old URL-based access (`?admin_key=KEY`) still works for backward compatibility.

---

## SECURITY BEST PRACTICES

✅ **DO:**
- Use strong, unique passwords
- Store credentials in password manager
- Rotate credentials every 6 months
- Limit admin access to authorized operators only

❌ **DON'T:**
- Share credentials via email/chat
- Use weak or common passwords
- Commit credentials to Git
- Leave admin mode active indefinitely

---

## QUICK REFERENCE

### Login Flow
```
1. Click "Admin" in footer
2. Enter username
3. Enter password
4. Click "Login"
5. System validates credentials
6. Admin key returned (if valid)
7. Admin mode activates
8. Red banner appears
```

### Environment Variables
```
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
ADMIN_ACCESS_KEY=a7f3c8e9d2b4f6a1c5e8d9b3f7a2c6e4...
ENABLE_ADMIN_MODE=true  # Optional, for production
```

### Admin Link Location
```
Footer: © 2025 TaxLetterHelp. Privacy Policy | Terms | Disclaimer | Admin
                                                                      ^^^^
```

---

## STATUS

✅ **Implemented and deployed**  
✅ **Server-side validation active**  
✅ **Login modal functional**  
✅ **Documentation updated**  
✅ **Ready for production use**

---

**For complete admin mode documentation, see:**
- `ADMIN-MODE-GUIDE.md` - Full guide
- `ADMIN-MODE-QUICK-START.md` - Quick setup
- `ENV-SETUP.md` - Environment variables

🎯 **Secure admin login is now live!**

