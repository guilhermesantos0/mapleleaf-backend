import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, IsEnum, Matches, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";
import { UserRole } from "@prisma/client";

export class CreateUserDto {
    @IsEmail({}, { message: 'Invalid email' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @IsString({ message: 'Password must be a string' })
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(32, { message: 'Password must be less than 32 characters long' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/, { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character' })
    password: string;

    @IsPhoneNumber('BR', { message: 'Invalid phone number' })
    @IsNotEmpty({ message: 'Phone number is required' })
    @Transform(({ value }) => value.replace(/\D/g, ''))
    phone: string;

    @IsString({ message: 'Name must be a string' })
    @IsNotEmpty({ message: 'Name is required' })
    @MinLength(3, { message: 'Name must be at least 3 characters long' })
    @MaxLength(100, { message: 'Name must be less than 100 characters long' })
    name: string;

    @IsOptional()
    @IsEnum(UserRole, { message: 'Invalid role' })
    role?: UserRole = UserRole.CLIENT;
}