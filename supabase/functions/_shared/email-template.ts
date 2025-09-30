/**
 * OHIO Golf Branded Email Template System
 * Provides consistent branding across all email communications
 */

interface EmailTemplateOptions {
  preheader?: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footerText?: string;
  includeSecurityNote?: boolean;
}

export function createBrandedEmailTemplate(options: EmailTemplateOptions): string {
  const {
    preheader = '',
    heading,
    body,
    ctaText,
    ctaUrl,
    footerText = 'OHIO Golf - Official Hole in 1 Competitions',
    includeSecurityNote = false,
  } = options;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${heading}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Montserrat:wght@400;500;600&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Montserrat', Arial, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      background-color: #f5f5f5;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .email-wrapper {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    
    .email-header {
      background: linear-gradient(135deg, #0F3D2E 0%, #1a5a44 100%);
      padding: 40px 20px;
      text-align: center;
    }
    
    .logo {
      max-width: 200px;
      height: auto;
      margin-bottom: 10px;
    }
    
    .header-tagline {
      font-family: 'Oswald', 'Arial Black', sans-serif;
      font-size: 14px;
      color: #C7A24C;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 10px;
    }
    
    .email-content {
      padding: 40px 30px;
    }
    
    .email-heading {
      font-family: 'Oswald', 'Arial Black', sans-serif;
      font-size: 32px;
      font-weight: 700;
      color: #0F3D2E;
      margin-bottom: 20px;
      line-height: 1.2;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .email-body {
      font-size: 16px;
      color: #333333;
      margin-bottom: 30px;
      line-height: 1.8;
    }
    
    .email-body p {
      margin-bottom: 15px;
    }
    
    .cta-button {
      display: inline-block;
      padding: 16px 40px;
      background: linear-gradient(135deg, #C7A24C 0%, #d4b15e 100%);
      color: #0F3D2E;
      text-decoration: none;
      font-family: 'Oswald', 'Arial Black', sans-serif;
      font-size: 18px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(199, 162, 76, 0.3);
      transition: all 0.3s ease;
    }
    
    .cta-button:hover {
      background: linear-gradient(135deg, #d4b15e 0%, #C7A24C 100%);
      box-shadow: 0 6px 20px rgba(199, 162, 76, 0.4);
      transform: translateY(-2px);
    }
    
    .security-note {
      background-color: #f8f9fa;
      border-left: 4px solid #C7A24C;
      padding: 15px 20px;
      margin: 30px 0;
      font-size: 14px;
      color: #666666;
    }
    
    .email-footer {
      background-color: #0F3D2E;
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
      font-size: 14px;
    }
    
    .footer-text {
      margin-bottom: 15px;
      color: #C7A24C;
      font-weight: 500;
    }
    
    .footer-links {
      margin-top: 15px;
      font-size: 12px;
      color: #a0a0a0;
    }
    
    .footer-links a {
      color: #C7A24C;
      text-decoration: none;
      margin: 0 10px;
    }
    
    @media only screen and (max-width: 600px) {
      .email-content {
        padding: 30px 20px;
      }
      
      .email-heading {
        font-size: 24px;
      }
      
      .cta-button {
        display: block;
        text-align: center;
        padding: 14px 30px;
      }
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>` : ''}
  
  <div class="email-wrapper">
    <!-- Header with Logo -->
    <div class="email-header">
      <svg class="logo" viewBox="0 0 842 344" xmlns="http://www.w3.org/2000/svg">
        <g fill="#C7A24C">
          <path d="M158.7 171.5c0 53.5-43.4 96.9-96.9 96.9S-35.1 225-35.1 171.5 7.3 74.6 60.8 74.6s97.9 43.4 97.9 96.9zm-96.9-76.1c-42 0-76.1 34.1-76.1 76.1s34.1 76.1 76.1 76.1 76.1-34.1 76.1-76.1-34.1-76.1-76.1-76.1z"/>
          <path d="M235.4 95.4h20.8v72.1h72.1V95.4h20.8v173.2h-20.8v-80.3h-72.1v80.3h-20.8V95.4zm127.5 0h20.8v173.2h-20.8V95.4zm138.9 0c48.1 0 87.1 39 87.1 87.1s-39 87.1-87.1 87.1-87.1-39-87.1-87.1 39-87.1 87.1-87.1zm0 20.8c-36.6 0-66.3 29.7-66.3 66.3s29.7 66.3 66.3 66.3 66.3-29.7 66.3-66.3-29.7-66.3-66.3-66.3z"/>
        </g>
        <g fill="#FFFFFF">
          <path d="M682.9 116.2h66.3v20.8h-45.5v41.9h41.9v20.8h-41.9v48.9h45.5v20.8h-66.3V116.2z"/>
        </g>
      </svg>
      <div class="header-tagline">Official Hole in 1</div>
    </div>
    
    <!-- Main Content -->
    <div class="email-content">
      <h1 class="email-heading">${heading}</h1>
      <div class="email-body">
        ${body}
      </div>
      
      ${ctaText && ctaUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
        </div>
      ` : ''}
      
      ${includeSecurityNote ? `
        <div class="security-note">
          <strong>🔒 Security Note:</strong> This email was sent from OHIO Golf. If you didn't request this email, you can safely ignore it. Never share your personal information or login details with anyone.
        </div>
      ` : ''}
    </div>
    
    <!-- Footer -->
    <div class="email-footer">
      <div class="footer-text">${footerText}</div>
      <div class="footer-links">
        <a href="https://holein1.golf">Visit Website</a> |
        <a href="https://holein1.golf/policies/privacy">Privacy Policy</a> |
        <a href="https://holein1.golf/policies/terms">Terms of Service</a>
      </div>
      <div style="margin-top: 15px; font-size: 11px; color: #888;">
        © ${new Date().getFullYear()} OHIO Golf. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Utility function for plain text version
export function createPlainTextVersion(heading: string, body: string, ctaUrl?: string): string {
  let plainText = `${heading}\n\n${body.replace(/<[^>]*>/g, '')}\n\n`;
  
  if (ctaUrl) {
    plainText += `Link: ${ctaUrl}\n\n`;
  }
  
  plainText += '---\nOHIO Golf - Official Hole in 1 Competitions\n';
  plainText += 'Visit: https://holein1.golf\n';
  
  return plainText;
}
