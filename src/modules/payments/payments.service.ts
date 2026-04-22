import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentProvider, PaymentStatus, PaymentType } from '@prisma/client';
import { PaymentService } from 'src/integrations/payment/payment.service';
import { CreateCardPaymentDto } from './dto/create-card-payment.dto';
import { CreatePixPaymentDto } from './dto/create-pix-payment.dto';

type CreatePaymentOptions = {
    idempotencyKey?: string;
};

@Injectable()
export class PaymentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mp: PaymentService,
    ) {}

    async createCardPayment(
        userId: string,
        body: CreateCardPaymentDto,
        opts: CreatePaymentOptions,
    ) {
        const order = await this.prisma.order.findFirst({
            where: { id: body.orderId, userId },
            select: {
                id: true,
                totalAmount: true,
                paymentStatus: true,
                orderNumber: true,
            },
        });

        if (!order) throw new NotFoundException('Pedido não encontrado');
        if (order.paymentStatus === PaymentStatus.APPROVED) {
            throw new BadRequestException('Pedido já está pago');
        }

        const idempotencyKey = opts.idempotencyKey ?? `order:${order.id}:CARD`;

        const existing = await this.prisma.paymentAttempt.findUnique({
            where: {
                provider_idempotencyKey: {
                    provider: PaymentProvider.MERCADO_PAGO,
                    idempotencyKey,
                },
            },
        });

        if (existing) {
            return {
                attemptId: existing.id,
                paymentId: existing.mpPaymentId,
                status: existing.status,
                statusDetail: existing.mpStatusDetail,
            };
        }

        const attempt = await this.prisma.paymentAttempt.create({
            data: {
                orderId: order.id,
                provider: PaymentProvider.MERCADO_PAGO,
                type: PaymentType.CARD,
                idempotencyKey,
                status: PaymentStatus.PENDING,
            },
        });

        const payment = await this.mp.createCardPayment({
            orderId: order.id,
            orderNumber: order.orderNumber,
            transactionAmount: Number(order.totalAmount),
            cardToken: body.cardToken,
            paymentMethodId: body.paymentMethodId,
            issuerId: body.issuerId ? Number(body.issuerId) : undefined,
            installments: body.installments,
            payer: body.payer,
            idempotencyKey,
        });

        await this.prisma.paymentAttempt.update({
            where: { id: attempt.id },
            data: {
                mpPaymentId: String(payment.id),
                mpStatus: payment.status,
                mpStatusDetail: payment.statusDetail,
                status: payment.mappedStatus,
            },
        });

        await this.prisma.order.update({
            where: { id: order.id },
            data: {
                paymentProvider: PaymentProvider.MERCADO_PAGO,
                paymentType: PaymentType.CARD,
                paymentStatus: payment.mappedStatus,
                externalPaymentId: String(payment.id),
                paymentMethod: payment.paymentMethodId,
            },
        });

        return {
            attemptId: attempt.id,
            paymentId: payment.id,
            status: payment.mappedStatus,
            statusDetail: payment.statusDetail,
        };
    }

    async createPixPayment(
        userId: string,
        body: CreatePixPaymentDto,
        opts: CreatePaymentOptions,
    ) {
        const order = await this.prisma.order.findFirst({
            where: { id: body.orderId, userId },
            select: {
                id: true,
                totalAmount: true,
                paymentStatus: true,
                orderNumber: true,
            },
        });

        if (!order) throw new NotFoundException('Pedido não encontrado');
        if (order.paymentStatus === PaymentStatus.APPROVED) {
            throw new BadRequestException('Pedido já está pago');
        }

        const idempotencyKey = opts.idempotencyKey ?? `order:${order.id}:PIX`;

        const existing = await this.prisma.paymentAttempt.findUnique({
            where: {
                provider_idempotencyKey: {
                    provider: PaymentProvider.MERCADO_PAGO,
                    idempotencyKey,
                },
            },
        });

        if (existing) {
            return {
                attemptId: existing.id,
                paymentId: existing.mpPaymentId,
                status: existing.status,
                pix: {
                    qrCode: existing.pixQrCode,
                    qrCodeBase64: existing.pixQrCodeBase64,
                    expirationDate: existing.pixExpiresAt,
                },
            };
        }

        const attempt = await this.prisma.paymentAttempt.create({
            data: {
                orderId: order.id,
                provider: PaymentProvider.MERCADO_PAGO,
                type: PaymentType.PIX,
                idempotencyKey,
                status: PaymentStatus.PENDING,
            },
        });

        const payment = await this.mp.createPixPayment({
            orderId: order.id,
            orderNumber: order.orderNumber,
            transactionAmount: Number(order.totalAmount),
            payer: body.payer,
            idempotencyKey,
        });

        await this.prisma.paymentAttempt.update({
            where: { id: attempt.id },
            data: {
                mpPaymentId: String(payment.id),
                mpStatus: payment.status,
                mpStatusDetail: payment.statusDetail,
                status: payment.mappedStatus,
                pixQrCode: payment.pix.qrCode,
                pixQrCodeBase64: payment.pix.qrCodeBase64,
                pixExpiresAt: payment.pix.expirationDate
                    ? new Date(payment.pix.expirationDate)
                    : null,
            },
        });

        await this.prisma.order.update({
            where: { id: order.id },
            data: {
                paymentProvider: PaymentProvider.MERCADO_PAGO,
                paymentType: PaymentType.PIX,
                paymentStatus: payment.mappedStatus,
                externalPaymentId: String(payment.id),
                paymentMethod: payment.paymentMethodId,
            },
        });

        return {
            attemptId: attempt.id,
            paymentId: payment.id,
            status: payment.mappedStatus,
            pix: payment.pix,
        };
    }

    async getPaymentStatus(userId: string, orderId: string) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, userId },
            select: {
                id: true,
                paymentStatus: true,
                paymentMethod: true,
                externalPaymentId: true,
                paymentProvider: true,
                paymentType: true,
                updatedAt: true,
            },
        });

        if (!order) throw new NotFoundException('Pedido não encontrado');

        return order;
    }
}
