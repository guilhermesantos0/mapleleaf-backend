import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentWebhookController } from './payment.controller';
import { PrismaModule } from 'src/modules/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [PaymentWebhookController],
    providers: [PaymentService],
    exports: [PaymentService],
})
export class PaymentModule {}
