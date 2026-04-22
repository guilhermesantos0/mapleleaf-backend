import { Module } from '@nestjs/common';
import { CartsService } from './carts.service';
import { CartsController } from './carts.controller';
import { ShippingModule } from 'src/integrations/shipping/shipping.module';

@Module({
    imports: [ShippingModule],
    controllers: [CartsController],
    providers: [CartsService],
})
export class CartsModule {}
