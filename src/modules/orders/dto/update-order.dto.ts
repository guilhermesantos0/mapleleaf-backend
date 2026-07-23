import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderDto {
    @IsOptional()
    @IsString()
    trackingCode?: string;

    @IsOptional()
    @IsEnum(OrderStatus, { message: 'Status de pedido inválido' })
    status?: OrderStatus;
}
