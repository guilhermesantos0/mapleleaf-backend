import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class FilterOrdersDto {
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

    @IsOptional()
    @IsString()
    customerName?: string;

    @IsOptional()
    @IsEnum(OrderStatus, { message: 'Status de pedido inválido' })
    status?: OrderStatus;

    @IsOptional()
    @IsString()
    startDate?: string;

    @IsOptional()
    @IsString()
    endDate?: string;
}
