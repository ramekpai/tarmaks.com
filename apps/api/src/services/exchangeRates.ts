import { EXCHANGE_RATES as FALLBACK_RATES_IN_USD } from '@tarmaks/shared';

interface ExchangeRatesResponse {
  result: string;
  rates: Record<string, number>;
  time_next_update_unix: number;
}

class ExchangeRateService {
  // Store rates as "Amount of currency per 1 USD" (e.g. RUB = 90)
  // The fallback rates in shared are "Value in USD" (e.g. RUB = 0.011)
  // We need to convert fallback rates to match API format for consistency
  private rates: Record<string, number> = {};
  private lastUpdate = 0;
  private updatePromise: Promise<void> | null = null;

  constructor() {
    // Initialize with converted fallback rates
    Object.entries(FALLBACK_RATES_IN_USD).forEach(([currency, valueInUsd]) => {
      if (valueInUsd > 0) {
        this.rates[currency] = 1 / valueInUsd;
      }
    });
    // Ensure USD is 1
    this.rates['USD'] = 1;
  }

  async getRates(): Promise<Record<string, number>> {
    if (this.shouldUpdate()) {
      await this.updateRates();
    }
    return this.rates;
  }

  async getRate(currency: string): Promise<number> {
    const rates = await this.getRates();
    return rates[currency] || 0;
  }

  private shouldUpdate(): boolean {
    const now = Date.now();
    // Update if older than 24 hours or if we only have fallback data (lastUpdate is 0)
    return now - this.lastUpdate > 24 * 60 * 60 * 1000;
  }

  private async updateRates(): Promise<void> {
    if (this.updatePromise) return this.updatePromise;

    this.updatePromise = (async () => {
      try {
        console.log('Fetching fresh exchange rates...');
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        if (!response.ok) throw new Error('Failed to fetch rates');
        
        const data = await response.json() as ExchangeRatesResponse;
        if (data.result === 'success') {
            this.rates = data.rates;
            this.lastUpdate = Date.now();
            console.log('Exchange rates updated successfully');
        }
      } catch (error) {
        console.error('Error updating exchange rates:', error);
        // Keep using fallback/old rates
      } finally {
        this.updatePromise = null;
      }
    })();

    return this.updatePromise;
  }
}

export const exchangeRateService = new ExchangeRateService();
