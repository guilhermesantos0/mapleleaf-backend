import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import {
    CreateCardPaymentInput,
    CreatePaymentResult,
    CreatePixPaymentInput,
    CreatePixPaymentResult,
    CreatePreferenceInput,
    PaymentInfo,
    PreferenceResult,
} from './payment.types';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentService implements OnModuleInit {
    private readonly logger = new Logger(PaymentService.name);
    private client: MercadoPagoConfig;
    private preference: Preference;
    private payment: Payment;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        this.client = new MercadoPagoConfig({
            accessToken: this.configService.getOrThrow<string>(
                'MERCADOPAGO_ACCESS_TOKEN',
            ),
        });
        this.preference = new Preference(this.client);
        this.payment = new Payment(this.client);
    }

    async createPreference(
        input: CreatePreferenceInput,
    ): Promise<PreferenceResult> {
        const response = await this.preference.create({
            body: {
                items: input.items.map((item, index) => ({
                    id: `${input.orderNumber}-${index + 1}`,
                    title: item.title,
                    quantity: item.quantity,
                    unit_price: item.unitPrice,
                    currency_id: item.currencyId ?? 'BRL',
                })),
                payer: {
                    email: input.payerEmail,
                    ...(input.payerName && {
                        name: input.payerName,
                    }),
                },
                external_reference: input.orderId,
                back_urls: {
                    success: `${this.configService.get('FRONTEND_URL')}/orders/success`,
                    failure: `${this.configService.get('FRONTEND_URL')}/orders/failure`,
                    pending: `${this.configService.get('FRONTEND_URL')}/orders/pending`,
                },
                auto_return: 'approved',
                notification_url: `${this.configService.get('BACKEND_URL')}/webhooks/mercadopago`,
            },
        });

        this.logger.log(
            `Preference created: ${response.id} for order ${input.orderId}`,
        );

        return {
            preferenceId: response.id!,
            initPoint: response.init_point!,
            sandboxInitPoint: response.sandbox_init_point!,
        };
    }

    async getPaymentInfo(paymentId: string): Promise<PaymentInfo> {
        const response = await this.payment.get({ id: paymentId });

        return {
            id: response.id!,
            status: response.status!,
            statusDetail: response.status_detail!,
            externalReference: response.external_reference!,
            transactionAmount: response.transaction_amount!,
            paymentMethodId: response.payment_method_id!,
            paymentTypeId: response.payment_type_id!,
        };
    }

    private mapStatus(status: string): PaymentStatus {
        const MP_STATUS_MAP: Record<string, PaymentStatus> = {
            approved: PaymentStatus.APPROVED,
            pending: PaymentStatus.PENDING,
            in_process: PaymentStatus.PENDING,
            rejected: PaymentStatus.REJECTED,
            refunded: PaymentStatus.REFUNDED,
            cancelled: PaymentStatus.CANCELLED,
            charged_back: PaymentStatus.REFUNDED,
        };

        return MP_STATUS_MAP[status] ?? PaymentStatus.PENDING;
    }

    async createCardPayment(
        input: CreateCardPaymentInput,
    ): Promise<CreatePaymentResult> {
        const issuerId =
            typeof input.issuerId === 'number' &&
            Number.isFinite(input.issuerId)
                ? input.issuerId
                : undefined;

        const response = await this.payment.create({
            requestOptions: {
                idempotencyKey: input.idempotencyKey,
            },
            body: {
                transaction_amount: input.transactionAmount,
                token: input.cardToken,
                description: `Pedido ${input.orderNumber}`,
                installments: input.installments,
                payment_method_id: input.paymentMethodId,
                ...(issuerId ? { issuer_id: issuerId } : {}),
                payer: {
                    email: input.payer.email,
                    ...(input.payer.name
                        ? { first_name: input.payer.name }
                        : {}),
                    ...(input.payer.cpf
                        ? {
                              identification: {
                                  type: 'CPF',
                                  number: input.payer.cpf,
                              },
                          }
                        : {}),
                },
                external_reference: input.orderId,
                notification_url: `${this.configService.get('BACKEND_URL')}/webhooks/mercadopago`,
            },
        });

        return {
            id: response.id ?? 0,
            status: response.status ?? 'pending',
            statusDetail: response.status_detail ?? 'pending',
            paymentMethodId:
                response.payment_method_id ?? input.paymentMethodId,
            paymentTypeId: response.payment_type_id ?? 'card',
            mappedStatus: this.mapStatus(response.status ?? 'pending'),
        };
    }

    async createPixPayment(
        input: CreatePixPaymentInput,
    ): Promise<CreatePixPaymentResult> {
        const response = await this.payment.create({
            requestOptions: {
                idempotencyKey: input.idempotencyKey,
            },
            body: {
                transaction_amount: input.transactionAmount,
                description: `Pedido ${input.orderNumber}`,
                payment_method_id: 'pix',
                payer: {
                    email: input.payer.email,
                    ...(input.payer.name
                        ? { first_name: input.payer.name }
                        : {}),
                    ...(input.payer.cpf
                        ? {
                              identification: {
                                  type: 'CPF',
                                  number: input.payer.cpf,
                              },
                          }
                        : {}),
                },
                external_reference: input.orderId,
                notification_url: `${this.configService.get('BACKEND_URL')}/webhooks/mercadopago`,
            },
        });

        const txData = response.point_of_interaction?.transaction_data;
        const expirationDate =
            txData &&
            typeof txData === 'object' &&
            'qr_code_expiration_date' in txData
                ? String(
                      (txData as Record<string, unknown>)[
                          'qr_code_expiration_date'
                      ],
                  )
                : undefined;

        if (!txData?.qr_code || !txData?.qr_code_base64) {
            this.logger.warn(
                `PIX payment created without QR data (paymentId=${response.id})`,
            );
        }

        return {
            id: response.id ?? 0,
            status: response.status ?? 'pending',
            statusDetail: response.status_detail ?? 'pending',
            paymentMethodId: response.payment_method_id ?? 'pix',
            paymentTypeId: response.payment_type_id ?? 'bank_transfer',
            mappedStatus: this.mapStatus(response.status ?? 'pending'),
            pix: {
                qrCode: txData?.qr_code ?? '',
                qrCodeBase64: txData?.qr_code_base64 ?? '',
                expirationDate,
            },
        };
    }
}
