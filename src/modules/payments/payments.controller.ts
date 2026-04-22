import {
    Body,
    Controller,
    Get,
    Headers,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { User } from 'src/common/decorators/user.decorator';
import { PaymentsService } from './payments.service';
import { CreateCardPaymentDto } from './dto/create-card-payment.dto';
import { CreatePixPaymentDto } from './dto/create-pix-payment.dto';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    private getUserId(user: unknown): string {
        if (typeof user === 'object' && user && 'id' in user) {
            const id = (user as { id?: unknown }).id;
            if (typeof id === 'string') return id;
        }
        throw new Error('Invalid user payload');
    }

    @UseGuards(JwtAuthGuard)
    @Post('card')
    async createCardPayment(
        @User() user: unknown,
        @Headers('idempotency-key') idempotencyKey: string | undefined,
        @Body() body: CreateCardPaymentDto,
    ) {
        return this.paymentsService.createCardPayment(
            this.getUserId(user),
            body,
            {
                idempotencyKey,
            },
        );
    }

    @UseGuards(JwtAuthGuard)
    @Post('pix')
    async createPixPayment(
        @User() user: unknown,
        @Headers('idempotency-key') idempotencyKey: string | undefined,
        @Body() body: CreatePixPaymentDto,
    ) {
        return this.paymentsService.createPixPayment(
            this.getUserId(user),
            body,
            {
                idempotencyKey,
            },
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get(':orderId/status')
    async getPaymentStatus(
        @User() user: unknown,
        @Param('orderId') orderId: string,
    ) {
        return this.paymentsService.getPaymentStatus(
            this.getUserId(user),
            orderId,
        );
    }
}
