import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ShippingModule } from 'src/integrations/shipping/shipping.module';

@Module({
    imports: [ShippingModule],
    controllers: [OrdersController],
    providers: [OrdersService],
})
export class OrdersModule {}
