import { IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateItemDto {
    @IsNumber()
    @IsNotEmpty()
    quantity: number;
}
