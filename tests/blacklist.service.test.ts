import { blacklistService } from '../src/services/BlacklistService';

describe('BlacklistService', () => {
  it('persists and retrieves blacklist checks by email', async () => {
    await blacklistService.create({
      email: 'blacklist-service@example.com',
      phone: '08011112222',
      raw_response: JSON.stringify({ data: { is_blacklisted: true } }),
    });

    const found = await blacklistService.findByEmail('blacklist-service@example.com');
    expect(found).toBeDefined();
    expect(found?.email).toBe('blacklist-service@example.com');
  });
});
