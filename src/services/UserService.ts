import { User, userRepository } from '../repositories/UserRepository';

export class UserService {

    /**
     * Finds a user by email address.
     * @param email string (user email)
     * @returns Promise<any> (database user record)
     * @throws Error if the database lookup fails
     */
    async findByEmail(email: string) {
        return await userRepository.findByEmail(email);
    }

    /**
     * Creates a new user record.
     * @param body Partial<User> (user payload)
     * @returns Promise<any> (created user record)
     * @throws Error if user creation fails
     */
    async createUser(body: Partial<User>) {
        return await userRepository.create(body);
    }

    /**
     * Finds a user by their unique identifier.
     * @param id string (user ID)
     * @returns Promise<any> (database user record)
     * @throws Error if the database lookup fails
     */
    async findById(id: string) {
        return await userRepository.findById(id);
    }
}

export const userService = new UserService();
