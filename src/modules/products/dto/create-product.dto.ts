import { plainToInstance, Transform, Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsDate,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { ProductCategory, ProductSize } from '@prisma/client';

export class CreateProductColorDto {
    @IsOptional()
    @IsString()
    id?: string;

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

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isHighlighted?: boolean;

    @IsOptional()
    @Transform(({ value }: { value: unknown }) =>
        value ? new Date(value as string | number | Date) : undefined,
    )
    @IsDate()
    releaseDate?: Date;

    @IsNotEmpty()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    defaultBoxWidth: number;

    @IsNotEmpty()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    defaultBoxHeight: number;

    @IsNotEmpty()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    defaultBoxLength: number;

    @IsNotEmpty()
    @Transform(({ value }) => Number(value))
    @IsNumber()
    defaultBoxWeight: number;

    @Transform(({ value }) => {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return plainToInstance(CreateProductColorDto, parsed);
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CreateProductColorDto)
    colors: CreateProductColorDto[];
}
