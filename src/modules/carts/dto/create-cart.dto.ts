import { IsInt, IsNotEmpty, IsString, Max, Min, IsOptional } from "class-validator";

export class CreateCartDto {
    @IsNotEmpty({ message: 'Product ID is required' })
    @IsString({ message: 'Product ID must be a string' })
    productId: string;

    @IsNotEmpty({ message: 'Product Color ID is required' })
    @IsString({ message: 'Product Color ID must be a string' })
    productColorId: string;

    @IsOptional()
    @IsInt({ message: 'Quantity must be an integer' })
    @Min(1, { message: 'Quantity must be greater than 0' })
    @Max(10, { message: 'Quantity must be less than 10' })
    quantity: number;
}
