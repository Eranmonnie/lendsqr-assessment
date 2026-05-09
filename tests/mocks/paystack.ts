import { paystackService } from '../../src/services/PaystackService';

export const mockPaystackInitializeSuccess = () =>
  jest.spyOn(paystackService, 'initializeTransaction').mockResolvedValue({
    data: {
      authorization_url: 'https://paystack.test/authorize',
      reference: 'DC-MOCK-REF',
    },
  } as any);

export const mockPaystackInitializeFailure = (message = 'init failed') =>
  jest.spyOn(paystackService, 'initializeTransaction').mockRejectedValue(new Error(message));

export const mockPaystackTransferSuccess = () =>
  jest.spyOn(paystackService, 'initiateTransfer').mockResolvedValue({
    data: {
      reference: 'DC-MOCK-WITHDRAW',
      status: 'success',
    },
  } as any);

export const mockPaystackTransferFailure = (message = 'transfer failed') =>
  jest.spyOn(paystackService, 'initiateTransfer').mockRejectedValue(new Error(message));
