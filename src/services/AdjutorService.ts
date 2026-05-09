import axios from 'axios';
import { env } from '../config/env';

export class AdjutorService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = env.adjutor.baseUrl;
    this.apiKey = env.adjutor.apiKey;
  }

  /**
   * Checks the Lendsqr Adjutor Karma blacklist for a given identity (e.g., BVN, email, phone)
   * @param identity string (BVN, email, or phone)
   * @returns Promise<any> (API response)
   * @throws Error if the API call fails
   */
  async checkKarma(identity: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/verification/karma/${identity}`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('Adjutor API error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Adjutor API Error', { cause: error });
    }
  }
}

export const adjutorService = new AdjutorService();
