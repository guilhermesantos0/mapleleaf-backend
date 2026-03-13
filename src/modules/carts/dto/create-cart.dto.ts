import { IsInt, IsNotEmpty, IsString, Max, Min, IsOptional } from "class-validator";

export class CreateCartDto {
    @IsNotEmpty({ message: 'Bag ID is required' })
    @IsString({ message: 'Bag ID must be a string' })
    bagId: string;

    @IsNotEmpty({ message: 'Bag Color ID is required' })
    @IsString({ message: 'Bag Color ID must be a string' })
    bagColorId: string;

    @IsOptional()
    @IsInt({ message: 'Quantity must be an integer' })
    @Min(1, { message: 'Quantity must be greater than 0' })
    @Max(10, { message: 'Quantity must be less than 10' })
    quantity: number;
}
