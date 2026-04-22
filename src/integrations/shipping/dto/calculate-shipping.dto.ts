import { IsArray, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PackageDto {
    width: number;
    height: number;
    length: number;
    weight: number;
    quantity: number;
}

export class CalculateShippingDto {
    @IsString()
    toZipCode: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PackageDto)
    packages: PackageDto[];
}
