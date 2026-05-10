import { blacklistRepository } from "../repositories/BlacklistRepository";


export class BlacklistService {

    /**
     * Stores a blacklist check record.
     * @param input any (blacklist payload)
     * @returns Promise<any> (created blacklist record)
     * @throws Error if persistence fails
     */
    async create(input: any) {
        return await blacklistRepository.create(input);
    }
    
    /**
     * Finds a blacklist check record by email.
     * @param email string (email address)
     * @returns Promise<any> (blacklist record)
     * @throws Error if the database lookup fails
     */
    async findByEmail(email: string) {
        return await blacklistRepository.findOne({ email });
    }
}
export const blacklistService = new BlacklistService();