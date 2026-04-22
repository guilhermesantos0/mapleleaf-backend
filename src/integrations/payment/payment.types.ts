export interface PaymentItem {
    title: string;
    quantity: number;
    unitPrice: number;
    currencyId?: string;
}

export interface CreatePreferenceInput {
    orderId: string;
    orderNumber: string;
    items: PaymentItem[];
    payerEmail: string;
    payerName?: string;
}

export interface PreferenceResult {
    preferenceId: string;
    initPoint: string;
    sandboxInitPoint: string;
}

export interface WebhookPayload {
    id: number;
    live_mode: boolean;
    type: string;
    date_created: string;
    user_id: number;
    api_version: string;
    action: string;
    data: {
        id: string;
    };
}

export interface PaymentInfo {
    id: number;
    status: string;
    statusDetail: string;
    externalReference: string;
    transactionAmount: number;
    paymentMethodId: string;
    paymentTypeId: string;
}

export interface PayerInput {
    email: string;
    name?: string;
    cpf?: string;
}

export interface CreateCardPaymentInput {
    orderId: string;
    orderNumber: string;
    transactionAmount: number;
    cardToken: string;
    paymentMethodId: string;
    issuerId?: number;
    installments: number;
    payer: PayerInput;
    idempotencyKey: string;
}

export interface CreatePixPaymentInput {
    orderId: string;
    orderNumber: string;
    transactionAmount: number;
    payer: PayerInput;
    idempotencyKey: string;
}

export interface CreatePaymentResult {
    id: number;
    status: string;
    statusDetail: string;
    paymentMethodId: string;
    paymentTypeId: string;
    mappedStatus: import('@prisma/client').PaymentStatus;
}

export interface CreatePixPaymentResult extends CreatePaymentResult {
    pix: {
        qrCode: string;
        qrCodeBase64: string;
        expirationDate?: string;
    };
}
