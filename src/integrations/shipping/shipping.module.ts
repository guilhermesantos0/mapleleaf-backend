import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ShippingService } from './shipping.service';

@Module({
    imports: [HttpModule],
    providers: [ShippingService],
    exports: [ShippingService],
})
export class ShippingModule {}
