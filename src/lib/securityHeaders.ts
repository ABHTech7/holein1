// Security headers utility for consistent application across the app
export const securityHeaders = {
  // CORS headers for API endpoints
  cors: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  },

  // Enhanced security headers with stricter CSP
  security: {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(self), usb=(), serial=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0"
  },

  // Complete headers for Edge Functions with enhanced security
  complete: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY", 
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'none'; script-src 'self'; connect-src 'self' https://*.supabase.co; frame-ancestors 'none'; base-uri 'none';",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Cache-Control": "no-store"
  }
};

/**
 * Get rate limit headers for responses
 */
export function getRateLimitHeaders(limit: number, remaining: number, resetTime: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
  };
}

/**
 * Detect and log suspicious activity patterns with enhanced checks
 */
export function detectSuspiciousActivity(
  ip: string,
  userAgent: string,
  endpoint: string,
  errors: string[]
): boolean {
  // Enhanced suspicious patterns
  const suspiciousPatterns = [
    // SQL Injection patterns
    /sql.*injection/i,
    /union.*select/i,
    /drop.*table/i,
    /exec.*sp_/i,
    /'.*or.*1=1/i,
    /;\s*(drop|create|alter|delete)/i,
    
    // XSS patterns
    /script.*alert/i,
    /<script|javascript:|vbscript:/i,
    /on\w+\s*=\s*["\'][^"\']*["\']/i,
    
    // Command injection
    /\|\s*(cat|ls|pwd|whoami|id|uname)/i,
    /`[^`]*`/,
    /\$\([^)]*\)/,
    
    // Path traversal
    /\.\.\/|\.\.\\|\.\.\%2f|\.\.\%5c/i,
    
    // Common attack tools
    /sqlmap|nikto|nmap|burp|metasploit/i,
    
    // Suspicious user agents
    /bot|crawler|spider|scraper/i
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => 
    errors.some(error => pattern.test(error)) ||
    pattern.test(endpoint) ||
    pattern.test(userAgent)
  );

  // Additional checks for rate limiting bypass attempts
  const rateLimitBypassPatterns = [
    /x-forwarded-for/i,
    /x-real-ip/i,
    /x-originating-ip/i
  ];
  
  const isBypassAttempt = rateLimitBypassPatterns.some(pattern =>
    pattern.test(userAgent) || errors.some(error => pattern.test(error))
  );

  if (isSuspicious || isBypassAttempt) {
    const severity = isBypassAttempt ? 'CRITICAL' : 'HIGH';
    console.warn(`[Security] Suspicious activity detected (${severity})`, {
      ip,
      userAgent: userAgent.substring(0, 200),
      endpoint,
      errors: errors.slice(0, 5), // Limit error logging
      timestamp: new Date().toISOString(),
      severity
    });
    
    // Enhanced logging for critical events
    if (isBypassAttempt) {
      console.error('[CRITICAL] Rate limit bypass attempt detected!');
    }
  }

  return isSuspicious || isBypassAttempt;
}

/**
 * Generate secure CSP nonce for inline scripts
 */
export function generateCSPNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/[+/=]/g, '');
}

/**
 * Get enhanced security headers with CSP nonce
 */
export function getEnhancedSecurityHeaders(nonce?: string): Record<string, string> {
  const headers = { ...securityHeaders.security };
  
  if (nonce) {
    headers['Content-Security-Policy'] = headers['Content-Security-Policy'].replace(
      "'unsafe-inline'",
      `'nonce-${nonce}'`
    );
  }
  
  return headers;
}