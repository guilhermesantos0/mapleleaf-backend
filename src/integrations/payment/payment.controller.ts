import {
    Body,
    Controller,
    Headers,
    HttpCode,
    HttpStatus,
    Logger,
    Post,
    Query,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { PaymentProvider, PaymentStatus, PaymentType } from '@prisma/client';
import { WebhookPayload } from './payment.types';
import * as crypto from 'crypto';

const MP_STATUS_MAP: Record<string, PaymentStatus> = {
    approved: PaymentStatus.APPROVED,
    pending: PaymentStatus.PENDING,
    in_process: PaymentStatus.PENDING,
    rejected: PaymentStatus.REJECTED,
    refunded: PaymentStatus.REFUNDED,
    cancelled: PaymentStatus.CANCELLED,
    charged_back: PaymentStatus.REFUNDED,
};

@Controller('webhooks')
export class PaymentWebhookController {
    private readonly logger = new Logger(PaymentWebhookController.name);

    constructor(
        private readonly paymentService: PaymentService,
        private readonly prisma: PrismaService,
    ) {}

    @Post('mercadopago')
    @HttpCode(HttpStatus.OK)
    async handleWebhook(
        @Body() body: WebhookPayload,
        @Headers('x-signature') xSignature?: string,
        @Headers('x-request-id') xRequestId?: string,
        @Query('data.id') dataIdQuery?: string,
    ) {
        const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

        if (secret) {
            const signatureOk = this.validateSignature({
                xSignature,
                xRequestId,
                secret,
                dataId: (dataIdQuery ?? body?.data?.id)?.toString(),
            });

            if (!signatureOk) {
                this.logger.warn('Invalid Mercado Pago webhook signature');
                return { received: true };
            }
        } else {
            this.logger.warn(
                'MERCADOPAGO_WEBHOOK_SECRET not set; skipping webhook signature validation',
            );
        }

        if (body.type !== 'payment') {
            return { received: true };
        }

        const paymentInfo = await this.paymentService.getPaymentInfo(
            body.data.id,
        );

        const mappedStatus =
            MP_STATUS_MAP[paymentInfo.status] ?? PaymentStatus.PENDING;

        this.logger.log(
            `Webhook received: payment ${paymentInfo.id} -> ${paymentInfo.status} (${mappedStatus}) for order ${paymentInfo.externalReference}`,
        );

        const existingAttempt = await this.prisma.paymentAttempt.findUnique({
            where: {
                provider_mpPaymentId: {
                    provider: PaymentProvider.MERCADO_PAGO,
                    mpPaymentId: String(paymentInfo.id),
                },
            },
            select: { id: true },
        });

        if (existingAttempt) {
            await this.prisma.paymentAttempt.update({
                where: { id: existingAttempt.id },
                data: {
                    status: mappedStatus,
                    mpStatus: paymentInfo.status,
                    mpStatusDetail: paymentInfo.statusDetail,
                },
            });
        } else {
            await this.prisma.paymentAttempt.create({
                data: {
                    orderId: paymentInfo.externalReference,
                    provider: PaymentProvider.MERCADO_PAGO,
                    type:
                        paymentInfo.paymentMethodId === 'pix'
                            ? PaymentType.PIX
                            : PaymentType.CARD,
                    status: mappedStatus,
                    idempotencyKey: `webhook:${paymentInfo.id}`,
                    mpPaymentId: String(paymentInfo.id),
                    mpStatus: paymentInfo.status,
                    mpStatusDetail: paymentInfo.statusDetail,
                },
            });
        }

        await this.prisma.order.update({
            where: { id: paymentInfo.externalReference },
            data: {
                paymentProvider: PaymentProvider.MERCADO_PAGO,
                paymentType:
                    paymentInfo.paymentMethodId === 'pix'
                        ? PaymentType.PIX
                        : PaymentType.CARD,
                paymentStatus: mappedStatus,
                externalPaymentId: String(paymentInfo.id),
                paymentMethod: paymentInfo.paymentMethodId,
            },
        });

        return { received: true };
    }

    private validateSignature(input: {
        xSignature?: string;
        xRequestId?: string;
        secret: string;
        dataId?: string;
    }): boolean {
        if (!input.xSignature || !input.xRequestId || !input.dataId) {
            return false;
        }

        const parts = input.xSignature.split(',');
        const tsPart = parts.find((p) => p.trim().startsWith('ts='));
        const v1Part = parts.find((p) => p.trim().startsWith('v1='));
        if (!tsPart || !v1Part) return false;

        const ts = tsPart.split('=')[1]?.trim();
        const v1 = v1Part.split('=')[1]?.trim();
        if (!ts || !v1) return false;

        const dataIdLower = input.dataId.toLowerCase();
        const template = `id:${dataIdLower};request-id:${input.xRequestId};ts:${ts};`;

        const computed = crypto
            .createHmac('sha256', input.secret)
            .update(template)
            .digest('hex');

        try {
            return crypto.timingSafeEqual(
                Buffer.from(computed, 'utf8'),
                Buffer.from(v1, 'utf8'),
            );
        } catch {
            return false;
        }
    }
}
