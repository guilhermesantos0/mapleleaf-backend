import { plainToInstance, Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { ProductCategory, ProductSize } from '@prisma/client';

export class CreateProductColorDto {
    @IsNotEmpty()
    @IsString()
    colorName: string;

    @IsOptional()
    @IsString()
    hexCode?: string;

    @IsOptional()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    stockQuantity?: number;
}

export class CreateProductDto {
    @IsNotEmpty()
    @IsEnum(ProductCategory)
    category: ProductCategory;

    @IsNotEmpty()
    @IsString()
    modelCode: string;

    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsString()
    description: string;

    @IsNotEmpty()
    @IsString()
    material: string;

    @IsNotEmpty()
    @IsEnum(ProductSize)
    size: ProductSize;

    @IsNotEmpty()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    price: number;

    @IsOptional()
    @Transform(({ value }) => (value != null ? Number(value) : undefined))
    @IsNumber()
    promotionPrice?: number;

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isPromotion?: boolean;

    @Transform(({ value }) => {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return plainToInstance(CreateProductColorDto, parsed);
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateProductColorDto)
    colors: CreateProductColorDto[];
}
