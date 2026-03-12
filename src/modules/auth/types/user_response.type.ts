import { UserRole } from "@prisma/client";

export type UserResponse = {
    id: string;
    email: string;
    name: string;
    role: UserRole;
}