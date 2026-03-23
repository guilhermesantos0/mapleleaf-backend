import { IsBoolean, IsEnum, IsNotEmpty, IsString, Matches } from "class-validator";

export class CreateAddressDto {
    @IsString()
    @IsNotEmpty({ message: 'Label is required' })
    label: string;

    @IsString()
    @IsNotEmpty({ message: 'Street is required' })
    street: string;

    @IsString()
    @IsNotEmpty({ message: 'Number is required' })
    number: string;

    @IsString()
    @IsNotEmpty({ message: 'City is required' })
    city: string;

    @IsString()
    @IsNotEmpty({ message: 'District is required' })
    district: string;

    @IsString()
    @IsNotEmpty({ message: 'Zip code is required' })
    @Matches(/^\d{5}-\d{3}$/, { message: 'Zip code must be in the format 00000-000' })
    zipCode: string;

    @IsString()
    @IsNotEmpty({ message: 'Complement is required' })
    complement: string;

    @IsString()
    @IsNotEmpty({ message: 'Country is required' })
    country: string;

    @IsString()
    @IsNotEmpty({ message: 'State is required' })
    state: string;

    @IsBoolean()
    @IsNotEmpty({ message: 'Is default is required' })
    isDefault: boolean;
}
