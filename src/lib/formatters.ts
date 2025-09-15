// Utility formatters for the Hole in 1 Challenge application

export const formatCurrency = (amountInPence: number, currency: string = 'GBP'): string => {
  const amount = amountInPence / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (date: string | Date, format: 'short' | 'medium' | 'long' = 'medium'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'short') {
    return new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: 'numeric',
    }).format(dateObj);
  }
  
  if (format === 'long') {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj);
  }
  
  // Default medium format
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
};

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
    // Modern clipboard API (preferred)
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn('Modern clipboard API failed, falling back to legacy method');
  }

  // Enhanced fallback for older browsers
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
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    
    return success;
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    return false;
  }
};
