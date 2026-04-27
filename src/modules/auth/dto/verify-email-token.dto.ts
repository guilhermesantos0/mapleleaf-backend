import { IsEmail, IsString } from 'class-validator';

export class VerifyEmailTokenDto {
    @IsEmail()
    email: string;

    @IsString()
    token: string;
}

