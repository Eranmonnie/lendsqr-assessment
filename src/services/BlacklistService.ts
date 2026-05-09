import { blacklistRepository } from "@/repositories/BlacklistRepository";


export class BlacklistService {

    async create(input: any) {
        return await blacklistRepository.create(input);
    }


    async findByEmail(email: string) {
        return await blacklistRepository.findOne({ email });
    }
}
export const blacklistService = new BlacklistService();