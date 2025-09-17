import { Page } from '@playwright/test';
import bankingData from '../fixtures/test-banking-data.json';

export type BankingDataType = keyof typeof bankingData;

/**
 * Mock banking service responses for testing
 */
export class BankingMocks {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Mock banking details response
   */
  async mockBankingDetails(dataType: BankingDataType, delay = 0) {
    const data = bankingData[dataType];
    
    await this.page.route('**/rest/v1/club_banking*', async (route) => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([data])
        });
      }, delay);
    });
  }

  /**
   * Mock banking details with loading delay
   */
  async mockBankingDetailsWithDelay(dataType: BankingDataType, delay = 500) {
    await this.mockBankingDetails(dataType, delay);
  }

  /**
   * Mock banking error
   */
  async mockBankingError(statusCode = 500, delay = 100) {
    await this.page.route('**/rest/v1/club_banking*', async (route) => {
      setTimeout(() => {
        route.fulfill({
          status: statusCode,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'internal_server_error',
            message: 'Failed to fetch banking details'
          })
        });
      }, delay);
    });
  }

  /**
   * Mock empty banking response (no banking setup)
   */
  async mockNoBanking(delay = 100) {
    await this.page.route('**/rest/v1/club_banking*', async (route) => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }, delay);
    });
  }

  /**
   * Mock banking update success
   */
  async mockBankingUpdate(success = true) {
    await this.page.route('**/rest/v1/club_banking*', async (route) => {
      if (route.request().method() === 'PATCH' || route.request().method() === 'POST') {
        if (success) {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        } else {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'validation_error',
              message: 'Invalid banking details'
            })
          });
        }
      } else {
        route.continue();
      }
    });
  }

  /**
   * Clear all banking mocks
   */
  async clearMocks() {
    await this.page.unroute('**/rest/v1/club_banking*');
  }

  /**
   * Assert banking request shape
   */
  async assertBankingRequestShape() {
    let lastRequest: any = null;
    
    await this.page.route('**/rest/v1/club_banking*', async (route) => {
      if (route.request().method() === 'PATCH' || route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        lastRequest = body;
        
        // Validate required fields
        if (!body.account_holder_name || !body.account_number || !body.sort_code) {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'missing_required_fields'
            })
          });
          return;
        }
      }
      
      route.continue();
    });
    
    return () => lastRequest;
  }
}

/**
 * Helper to determine if banking data is complete
 */
export function isBankingDataComplete(dataType: BankingDataType): boolean {
  const data = bankingData[dataType];
  
  return !!(
    data.account_holder_name &&
    data.account_number &&
    data.sort_code &&
    data.bank_name
  );
}

/**
 * Get banking test data
 */
export function getBankingTestData(dataType: BankingDataType) {
  return bankingData[dataType];
}