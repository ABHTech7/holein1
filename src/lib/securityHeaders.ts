// Security headers utility for consistent application across the app
export const securityHeaders = {
  // CORS headers for API endpoints
  cors: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  },

  // Enhanced security headers
  security: {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  },

  // Complete headers for Edge Functions
  complete: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY", 
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none';",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
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
 * Detect and log suspicious activity patterns
 */
export function detectSuspiciousActivity(
  ip: string,
  userAgent: string,
  endpoint: string,
  errors: string[]
): boolean {
  // Check for common attack patterns
  const suspiciousPatterns = [
    /sql.*injection/i,
    /script.*alert/i,
    /<script|javascript:|vbscript:/i,
    /union.*select/i,
    /drop.*table/i,
    /exec.*sp_/i
  ];

  const isSuspicious = suspiciousPatterns.some(pattern => 
    errors.some(error => pattern.test(error)) ||
    pattern.test(endpoint) ||
    pattern.test(userAgent)
  );

  if (isSuspicious) {
    console.warn('Suspicious activity detected', {
      ip,
      userAgent,
      endpoint,
      errors,
      timestamp: new Date().toISOString()
    });
  }

  return isSuspicious;
}