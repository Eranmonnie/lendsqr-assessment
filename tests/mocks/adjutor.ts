import { adjutorService } from '../../src/services/AdjutorService';

export const mockAdjutorBlacklisted = () =>
  jest.spyOn(adjutorService, 'checkKarma').mockResolvedValue({
    data: { is_blacklisted: true },
  });

export const mockAdjutorClean = () =>
  jest.spyOn(adjutorService, 'checkKarma').mockResolvedValue({
    data: null,
  });

export const mockAdjutorFailure = (message = 'Adjutor API Error') =>
  jest.spyOn(adjutorService, 'checkKarma').mockRejectedValue(new Error(message));
