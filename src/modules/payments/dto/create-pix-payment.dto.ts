import { IsEmail, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PayerDto {
    @IsEmail()
    email: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    cpf?: string;
}

export class CreatePixPaymentDto {
    @IsString()
    orderId: string;

    @ValidateNested()
    @Type(() => PayerDto)
    payer: PayerDto;
}
