import {
    IsInt,
    IsNotEmpty,
    IsString,
    Max,
    Min,
    IsOptional,
} from 'class-validator';

export class CreateCartDto {
    @IsNotEmpty({ message: 'ID do produto é obrigatório' })
    @IsString({ message: 'ID do produto deve ser uma string' })
    productId: string;

    @IsNotEmpty({ message: 'ID da cor do produto é obrigatório' })
    @IsString({ message: 'ID da cor do produto deve ser uma string' })
    productColorId: string;

    @IsOptional()
    @IsInt({ message: 'A quantidade deve ser um número inteiro' })
    @Min(1, { message: 'A quantidade deve ser maior que 0' })
    @Max(10, { message: 'A quantidade deve ser menor que 10' })
    quantity: number;
}
