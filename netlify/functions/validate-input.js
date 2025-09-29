// Input validation utilities
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

export function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  
  // Remove potentially dangerous characters
  return text
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 10000); // Limit length
}

export function validateFileUpload(file) {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif'
  ];
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only PDF and image files are allowed.');
  }
  
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.');
  }
  
  return true;
}

export function validatePlanType(planType) {
  const validPlans = ['STANDARD', 'COMPLEX', 'STARTER', 'PRO', 'PROPLUS'];
  return validPlans.includes(planType);
}

export function rateLimitCheck(userId, action, limit = 10, windowMs = 60000) {
  // Simple in-memory rate limiting (in production, use Redis)
  const now = Date.now();
  const key = `${userId}-${action}`;
  
  if (!global.rateLimitStore) {
    global.rateLimitStore = new Map();
  }
  
  const userLimits = global.rateLimitStore.get(key) || [];
  const recentActions = userLimits.filter(time => now - time < windowMs);
  
  if (recentActions.length >= limit) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  recentActions.push(now);
  global.rateLimitStore.set(key, recentActions);
  
  return true;
}

export function validateStripeWebhookSignature(payload, signature, secret) {
  const crypto = require('crypto');
  
  const elements = signature.split(',');
  const signatureHash = elements.find(el => el.startsWith('v1='));
  
  if (!signatureHash) {
    throw new Error('Invalid signature format');
  }
  
  const hash = signatureHash.split('=')[1];
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  if (hash !== expectedHash) {
    throw new Error('Invalid signature');
  }
  
  return true;
}
