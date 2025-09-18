/**
 * Analytics tracking for Hole in 1 Challenge
 * Tracks key events throughout the player journey
 */

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

class Analytics {
  private isEnabled: boolean;

  constructor() {
    // Enable analytics in production, disable in development for now
    this.isEnabled = process.env.NODE_ENV === 'production';
  }

  private log(event: AnalyticsEvent) {
    const eventData = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    if (this.isEnabled) {
      // In production, you would send to your analytics service
      // Example: amplitude, mixpanel, GA4, etc.
      console.log('📊 Analytics Event:', eventData);
      
      // Example integration (commented out):
      // window.gtag?.('event', event.event, event.properties);
      // window.amplitude?.track(event.event, event.properties);
    } else {
      // Development logging
      console.log('📊 [DEV] Analytics Event:', eventData);
    }
  }

  // Entry journey events
  entryViewed(competitionId: string, venueName: string, holeNumber: number) {
    this.log({
      event: 'entry_viewed',
      properties: {
        competition_id: competitionId,
        venue_name: venueName,
        hole_number: holeNumber
      }
    });
  }

  enterNowClicked(competitionId: string, isAuthenticated: boolean) {
    this.log({
      event: 'enter_now_clicked',
      properties: {
        competition_id: competitionId,
        is_authenticated: isAuthenticated
      }
    });
  }

  // Authentication events
  authModalOpened(source: string) {
    this.log({
      event: 'auth_modal_opened',
      properties: { source }
    });
  }

  authMethodSelected(method: 'email') {
    this.log({
      event: 'auth_method_selected',
      properties: { method }
    });
  }

  authCompleted(method: 'email', userId: string) {
    this.log({
      event: 'auth_completed',
      properties: { 
        method,
        user_id: userId
      }
    });
  }

  authFailed(method: 'email', error: string) {
    this.log({
      event: 'auth_failed',
      properties: { 
        method,
        error
      }
    });
  }

  // Profile events
  profileFormShown(userId: string) {
    this.log({
      event: 'profile_form_shown',
      properties: { user_id: userId }
    });
  }

  profileCompleted(userId: string) {
    this.log({
      event: 'profile_completed',
      properties: { user_id: userId }
    });
  }

  profileSkipped(userId: string) {
    this.log({
      event: 'profile_skipped',
      properties: { user_id: userId }
    });
  }

  // Payment events
  paymentStarted(competitionId: string, amount: number) {
    this.log({
      event: 'payment_started',
      properties: {
        competition_id: competitionId,
        amount_minor: amount
      }
    });
  }

  paymentSucceeded(competitionId: string, entryId: string, amount: number) {
    this.log({
      event: 'payment_succeeded',
      properties: {
        competition_id: competitionId,
        entry_id: entryId,
        amount_minor: amount
      }
    });
  }

  paymentFailed(competitionId: string, amount: number, error: string) {
    this.log({
      event: 'payment_failed',
      properties: {
        competition_id: competitionId,
        amount_minor: amount,
        error
      }
    });
  }

  // Entry confirmation events
  entryConfirmed(entryId: string, competitionId: string) {
    this.log({
      event: 'entry_confirmed',
      properties: {
        entry_id: entryId,
        competition_id: competitionId
      }
    });
  }

  // Outcome events
  outcomeMiss(entryId: string) {
    this.log({
      event: 'outcome_miss',
      properties: { entry_id: entryId }
    });
  }

  outcomeAutoMiss(entryId: string) {
    this.log({
      event: 'outcome_auto_miss',
      properties: { entry_id: entryId }
    });
  }

  outcomeWinClaimed(entryId: string) {
    this.log({
      event: 'outcome_win_claimed',
      properties: { entry_id: entryId }
    });
  }

  staffCodeAttempt(entryId: string, success: boolean) {
    this.log({
      event: 'staff_code_attempt',
      properties: { 
        entry_id: entryId,
        success
      }
    });
  }

  // Cooldown events
  cooldownEncountered(entryId: string, remainingTime: number) {
    this.log({
      event: 'cooldown_encountered',
      properties: {
        entry_id: entryId,
        remaining_time_ms: remainingTime
      }
    });
  }

  // Error events
  errorEncountered(error: string, context?: string) {
    this.log({
      event: 'error_encountered',
      properties: {
        error,
        context
      }
    });
  }

  // Generic custom event
  track(eventName: string, properties?: Record<string, any>) {
    this.log({
      event: eventName,
      properties
    });
  }
}

// Export singleton instance
export const analytics = new Analytics();

// Export for easier imports
export default analytics;