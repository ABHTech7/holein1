// Utility formatters for the Official Hole in 1 application

export const formatCurrency = (amountInPence: number, currency: string = 'GBP'): string => {
  const amount = amountInPence / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Cross-browser date parsing helper (handles Safari)
const toValidDate = (input: string | Date): Date => {
  if (input instanceof Date) return input;
  if (typeof input === 'string') {
    const s = input.trim();
    // Date-only strings
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const d = new Date(`${s}T00:00:00Z`);
      if (!isNaN(d.getTime())) return d;
    }
    // Replace space with T
    const s1 = s.replace(' ', 'T');
    let d1 = new Date(s1);
    if (!isNaN(d1.getTime())) return d1;
    // Safari fallback: use slashes
    const s2 = s.replace(/-/g, '/');
    d1 = new Date(s2);
    if (!isNaN(d1.getTime())) return d1;
  }
  return new Date(NaN);
};

export const formatDate = (date: string | Date, format: 'short' | 'medium' | 'long' = 'medium'): string => {
  const dateObj = toValidDate(date);
  if (isNaN(dateObj.getTime())) {
    return typeof date === 'string' ? date : '';
  }
  
  if (format === 'short') {
    return new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(dateObj);
  }
  
  if (format === 'long') {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(dateObj);
  }
  
  // Default medium format
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(dateObj);
};

export const formatDateTime = (date: string | Date): string => {
  const dateObj = toValidDate(date);
  if (isNaN(dateObj.getTime())) {
    return typeof date === 'string' ? date : '';
  }
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(dateObj);
};

export const obfuscateEmail = (email: string): string => {
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}${localPart[1]}***@${domain}`;
};

export const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(dateObj, 'short');
  }
};

export const getCompetitionStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'bg-success text-success-foreground';
    case 'SCHEDULED':
      return 'bg-warning text-warning-foreground';
    case 'ENDED':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  try {
    // Check if we're in a secure context and have clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      console.log('✅ Clipboard copy successful via modern API');
      return true;
    }
  } catch (error) {
    console.warn('Modern clipboard API failed:', error);
  }

  // Enhanced fallback for older browsers or insecure contexts
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    textarea.setAttribute('readonly', '');
    textarea.setAttribute('aria-hidden', 'true');
    
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    if (success) {
      console.log('✅ Clipboard copy successful via fallback method');
    } else {
      console.error('❌ Fallback clipboard copy failed');
    }
    
    return success;
  } catch (error) {
    console.error('❌ All clipboard copy methods failed:', error);
    return false;
  }
};
