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
   * Initializes a transaction to fund a wallet
   * Amount should be in kobo (NGN * 100)
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
   * Initiate a transfer (Withdrawal)
   * Amount should be in NGN, we convert to kobo here
   */
  async initiateTransfer(amount: number, recipientCode: string, reason: string, reference: string) {
    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transfer`,
        {
          source: 'balance',
          amount: Math.round(amount * 100), // convert to kobo
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
