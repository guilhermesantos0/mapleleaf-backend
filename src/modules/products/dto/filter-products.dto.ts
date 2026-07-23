import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ProductCategory, ProductSize } from '@prisma/client';

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
    @IsEnum(ProductSize)
    size?: ProductSize;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    limit?: number;
}
