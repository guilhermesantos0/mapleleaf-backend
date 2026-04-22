import {
    IsEmail,
    IsInt,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
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

export class CreateCardPaymentDto {
    @IsString()
    orderId: string;

    @IsString()
    cardToken: string;

    @IsString()
    paymentMethodId: string;

    @IsOptional()
    @IsString()
    issuerId?: string;

    @IsInt()
    @Min(1)
    installments: number;

    @ValidateNested()
    @Type(() => PayerDto)
    payer: PayerDto;
}
