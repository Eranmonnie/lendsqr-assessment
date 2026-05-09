import { User, userRepository } from '../repositories/UserRepository';

export class UserService {

    async findByEmail(email: string) {
        return await userRepository.findByEmail(email);
    }

    async createUser(body: Partial<User>) {
        return await userRepository.create(body);
    }

    async findById(id: string) {
        return await userRepository.findById(id);
    }
}

export const userService = new UserService();
