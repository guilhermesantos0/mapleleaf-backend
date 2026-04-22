import { IsNotEmpty, IsString, IsBoolean, Matches } from 'class-validator';

export class CreateAddressDto {
    @IsString()
    @IsNotEmpty({ message: 'Rótulo é obrigatório' })
    label: string;

    @IsString()
    @IsNotEmpty({ message: 'Rua é obrigatória' })
    street: string;

    @IsString()
    @IsNotEmpty({ message: 'Número é obrigatório' })
    number: string;

    @IsString()
    @IsNotEmpty({ message: 'Cidade é obrigatória' })
    city: string;

    @IsString()
    @IsNotEmpty({ message: 'Bairro é obrigatório' })
    district: string;

    @IsString()
    @IsNotEmpty({ message: 'CEP é obrigatório' })
    @Matches(/^\d{5}-\d{3}$/, {
        message: 'O CEP deve estar no formato 00000-000',
    })
    zipCode: string;

    @IsString()
    @IsNotEmpty({ message: 'Complemento é obrigatório' })
    complement: string;

    @IsString()
    @IsNotEmpty({ message: 'País é obrigatório' })
    country: string;

    @IsString()
    @IsNotEmpty({ message: 'Estado é obrigatório' })
    state: string;

    @IsBoolean()
    @IsNotEmpty({ message: 'Indicação de endereço padrão é obrigatória' })
    isDefault: boolean;
}
