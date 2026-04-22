import {
    IsArray,
    IsEmail,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class PaymentItemDto {
    @IsString()
    title: string;

    quantity: number;

    unitPrice: number;
}

export class CreatePaymentDto {
    @IsString()
    orderId: string;

    @IsEmail()
    payerEmail: string;

    @IsOptional()
    @IsString()
    payerName?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PaymentItemDto)
    items: PaymentItemDto[];
}
