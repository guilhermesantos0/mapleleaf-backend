import { IsNumber, IsString } from 'class-validator';

export class CheckoutDto {
    @IsString()
    addressId: string;

    @IsNumber()
    shippingServiceId: number;
}
