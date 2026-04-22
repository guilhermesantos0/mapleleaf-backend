import { IsNumber, IsOptional } from 'class-validator';

export class DeleteItemDto {
    @IsNumber()
    @IsOptional()
    quantity?: number;
}
