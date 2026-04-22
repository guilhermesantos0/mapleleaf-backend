import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ProductCategory } from '@prisma/client';

export class FilterProductsDto {
    @IsOptional()
    @IsEnum(ProductCategory)
    category?: ProductCategory;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    date?: 'asc' | 'desc';

    @IsOptional()
    @IsString()
    price?: 'asc' | 'desc';

    @IsOptional()
    @IsString()
    size?: 'asc' | 'desc';

    @IsOptional()
    @IsNumber()
    page?: number;

    @IsOptional()
    @IsNumber()
    limit?: number;
}
