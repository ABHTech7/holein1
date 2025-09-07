// Utility formatters for the Hole in 1 Challenge application

export const formatCurrency = (amountInCents: number, currency: string = 'GBP'): string => {
  const amount = amountInCents / 100;
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
  console.log('Attempting to copy:', text);
  
  // First try modern clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      console.log('Using navigator.clipboard');
      await navigator.clipboard.writeText(text);
      console.log('Copy successful with navigator.clipboard');
      return true;
    } catch (error) {
      console.error('navigator.clipboard failed:', error);
    }
  }
  
  // Fallback method
  console.log('Using fallback copy method');
  return copyFallback(text);
};

const copyFallback = (text: string): boolean => {
  try {
    // Create a temporary input element that's visible
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make it visible but off-screen
    textArea.style.position = 'absolute';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.width = '1px';
    textArea.style.height = '1px';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    
    document.body.appendChild(textArea);
    
    // Focus and select
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    
    // Try to copy
    let result = false;
    try {
      result = document.execCommand('copy');
      console.log('document.execCommand copy result:', result);
    } catch (err) {
      console.error('document.execCommand failed:', err);
    }
    
    // Clean up
    document.body.removeChild(textArea);
    
    // If document.execCommand failed, try one more approach
    if (!result && navigator.clipboard) {
      try {
        navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error('Final clipboard attempt failed:', err);
      }
    }
    
    return result;
  } catch (fallbackError) {
    console.error('Fallback copy method failed:', fallbackError);
    return false;
  }
};