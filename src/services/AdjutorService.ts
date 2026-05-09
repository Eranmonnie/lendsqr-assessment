import axios from 'axios';

export class AdjutorService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.ADJUTOR_BASE_URL || '';
    this.apiKey = process.env.ADJUTOR_API_KEY || '';
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
      // Log error for debugging
      console.error('Adjutor API error:', error.response?.data || error.message);
      // Throw a standard error
      throw new Error(error.response?.data?.message || 'Adjutor API Error');
    }
  }
}

export const adjutorService = new AdjutorService();
