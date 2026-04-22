import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsPhoneNumber,
    IsString,
    IsEnum,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
    @IsEmail({}, { message: 'E-mail inválido' })
    @IsNotEmpty({ message: 'E-mail é obrigatório' })
    email: string;

    @IsString({ message: 'A senha deve ser uma string' })
    @IsNotEmpty({ message: 'Senha é obrigatória' })
    @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
    @MaxLength(32, { message: 'A senha deve ter no máximo 32 caracteres' })
    @Matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/,
        {
            message:
                'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial',
        },
    )
    password: string;

    @IsPhoneNumber('BR', { message: 'Telefone inválido' })
    @IsNotEmpty({ message: 'Telefone é obrigatório' })
    @Transform(({ value }) => value.replace(/\D/g, ''))
    phone: string;

    @IsString({ message: 'O nome deve ser uma string' })
    @IsNotEmpty({ message: 'Nome é obrigatório' })
    @MinLength(3, { message: 'O nome deve ter no mínimo 3 caracteres' })
    @MaxLength(100, { message: 'O nome deve ter no máximo 100 caracteres' })
    name: string;

    @IsOptional()
    @IsEnum(UserRole, { message: 'Função inválida' })
    role?: UserRole = UserRole.CLIENT;
}
