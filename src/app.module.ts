import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { RedisCacheModule } from './config/redis-cache.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CartsModule } from './modules/carts/carts.module';
import { ProductsModule } from './modules/products/products.module';
import { UsersModule } from './modules/users/users.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { PaymentModule } from './integrations/payment/payment.module';
import { ShippingModule } from './integrations/shipping/shipping.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        RedisCacheModule,
        PrismaModule,
        MailModule,
        AuthModule,
        PaymentModule,
        ShippingModule,
        OrdersModule,
        PaymentsModule,
        CartsModule,
        ProductsModule,
        UsersModule,
        AddressesModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
