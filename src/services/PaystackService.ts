import axios from 'axios';
import { env } from '../config/env';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export class PaystackService {
  private get headers() {
    return {
      Authorization: `Bearer ${env.paystack.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Removes empty query parameters before sending a Paystack request.
   * @param params Record<string, unknown> (query parameters)
   * @returns Record<string, unknown> (filtered query parameters)
   */
  private buildQueryParams(params: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
  }

  /**
   * Initializes a transaction to fund a wallet
   * Amount should be in kobo (NGN * 100)
    * @param email string (customer email)
    * @param amount number (amount in NGN)
    * @param reference string (transaction reference)
    * @returns Promise<any> (Paystack initialization response)
    * @throws Error if the API call fails
   */
  async initializeTransaction(email: string, amount: number, reference: string) {
    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email,
          amount: Math.round(amount * 100), // convert to kobo
          reference,
          channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(`Paystack Initialization Error: ${error.response?.data?.message || error.message}`, { cause: error });
    }
  }

  /**
   * Verify a transaction after webhook event or user redirect
    * @param reference string (transaction reference)
    * @returns Promise<any> (Paystack verification response)
    * @throws Error if the API call fails
   */
  async verifyTransaction(reference: string) {
    try {
      const response = await axios.get(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
        headers: this.headers,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(`Paystack Verification Error: ${error.response?.data?.message || error.message}`, { cause: error });
    }
  }

  /**
   * Create a transfer recipient (required before initiating a withdrawal)
    * @param name string (recipient name)
    * @param accountNumber string (bank account number)
    * @param bankCode string (bank code)
    * @returns Promise<any> (Paystack recipient response)
    * @throws Error if the API call fails
   */
  async createTransferRecipient(name: string, accountNumber: string, bankCode: string) {
    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transferrecipient`,
        {
          type: 'nuban',
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(`Paystack Recipient Error: ${error.response?.data?.message || error.message}`, { cause: error });
    }
  }

  /**
   * Get list of banks with their codes
    * @param options object (Paystack bank query options)
    * @returns Promise<any> (Paystack banks response)
    * @throws Error if the API call fails
   */
  async getBanks(options: {
    country?: string;
    perPage?: number;
    pageNumber?: number;
    useCursor?: boolean;
    payWithBankTransfer?: boolean;
    payWithBank?: boolean;
    enabledForVerification?: boolean;
    next?: string;
    previous?: string;
    gateway?: string;
    type?: string;
    currency?: string;
    includeNipSortCode?: boolean;
  } = {}) {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/bank`,
        {
          params: this.buildQueryParams({
            country: options.country ?? 'nigeria',
            perPage: options.perPage ?? 50,
            page: options.pageNumber ?? 1,
            use_cursor: options.useCursor,
            pay_with_bank_transfer: options.payWithBankTransfer,
            pay_with_bank: options.payWithBank,
            enabled_for_verification: options.enabledForVerification,
            next: options.next,
            previous: options.previous,
            gateway: options.gateway,
            type: options.type,
            currency: options.currency,
            include_nip_sort_code: options.includeNipSortCode,
          }),
          headers: this.headers,
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(`Paystack Get Banks Error: ${error.response?.data?.message || error.message}`, { cause: error });
    }
  }

  /**
   * Resolve account name from account number and bank code
   * Used for bank enquiry before adding a recipient
    * @param accountNumber string (bank account number)
    * @param bankCode string (bank code)
    * @returns Promise<any> (Paystack account resolution response)
    * @throws Error if the API call fails
   */
  async resolveAccountNumber(accountNumber: string, bankCode: string) {
    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/bank/resolve`,
        {
          params: {
            account_number: accountNumber,
            bank_code: bankCode,
          },
          headers: this.headers,
        }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(`Paystack Bank Resolve Error: ${error.response?.data?.message || error.message}`, { cause: error });
    }
  }

  /**
   * Initiate a transfer (Withdrawal)
   * Amount should be in NGN, we convert to kobo here
    * @param amount number (amount in NGN)
    * @param recipientCode string (Paystack recipient code)
    * @param reason string (transfer reason)
    * @param reference string (transaction reference)
    * @returns Promise<any> (Paystack transfer response)
    * @throws Error if the API call fails
   */
  async initiateTransfer(amount: number, recipientCode: string, reason: string, reference: string) {
    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transfer`,
        {
          source: 'balance',
          amount: Math.round(amount * 100),
          recipient: recipientCode,
          reason,
          reference,
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(`Paystack Transfer Error: ${error.response?.data?.message || error.message}`, { cause: error });
    }
  }
}

export const paystackService = new PaystackService();
