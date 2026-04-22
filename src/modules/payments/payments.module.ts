import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentModule } from 'src/integrations/payment/payment.module';

@Module({
    imports: [PrismaModule, PaymentModule],
    controllers: [PaymentsController],
    providers: [PaymentsService],
})
export class PaymentsModule {}
