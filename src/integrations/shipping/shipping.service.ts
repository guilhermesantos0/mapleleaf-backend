import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
    ShippingPackage,
    ShippingQuoteOption,
    ShippingOrderInput,
    ShippingOrderResult,
    ShippingLabelResult,
    TrackingResult,
} from './shipping.types';

@Injectable()
export class ShippingService {
    private readonly logger = new Logger(ShippingService.name);
    private readonly apiUrl: string;
    private readonly token: string;
    private readonly fromZipCode: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.apiUrl = this.configService.getOrThrow('MELHOR_ENVIO_API_URL');
        this.token = this.configService.getOrThrow('MELHOR_ENVIO_TOKEN');
        this.fromZipCode = this.configService.getOrThrow(
            'MELHOR_ENVIO_FROM_ZIPCODE',
        );
    }

    private get headers() {
        return {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'MapleLeaf (contato@mapleleaf.com)',
        };
    }

    async calculateShipping(
        toZipCode: string,
        packages: ShippingPackage[],
    ): Promise<ShippingQuoteOption[]> {
        const { data } = await firstValueFrom(
            this.httpService.post(
                `${this.apiUrl}/me/shipment/calculate`,
                {
                    from: { postal_code: this.fromZipCode },
                    to: { postal_code: toZipCode },
                    packages: packages.map((pkg) => ({
                        width: pkg.width,
                        height: pkg.height,
                        length: pkg.length,
                        weight: pkg.weight,
                    })),
                },
                { headers: this.headers },
            ),
        );

        return data
            .filter((option: any) => !option.error)
            .map((option: any) => ({
                id: option.id,
                name: option.name,
                company: {
                    id: option.company.id,
                    name: option.company.name,
                    picture: option.company.picture,
                },
                price: option.custom_price ?? option.price,
                deliveryMin: option.delivery_range?.min ?? option.delivery_time,
                deliveryMax: option.delivery_range?.max ?? option.delivery_time,
            }));
    }

    async createShippingOrder(
        input: ShippingOrderInput,
    ): Promise<ShippingOrderResult> {
        const { data } = await firstValueFrom(
            this.httpService.post(
                `${this.apiUrl}/me/cart`,
                {
                    service: input.serviceId,
                    from: { postal_code: input.fromZipCode },
                    to: { postal_code: input.toZipCode },
                    packages: input.packages.map((pkg) => ({
                        width: pkg.width,
                        height: pkg.height,
                        length: pkg.length,
                        weight: pkg.weight,
                    })),
                    products: input.products.map((p) => ({
                        name: p.name,
                        quantity: p.quantity,
                        unitary_value: p.unitaryValue,
                    })),
                    options: {
                        insurance_value: input.products.reduce(
                            (sum, p) => sum + p.unitaryValue * p.quantity,
                            0,
                        ),
                        receipt: false,
                        own_hand: false,
                    },
                },
                { headers: this.headers },
            ),
        );

        this.logger.log(`Shipping order created: ${data.id}`);

        return {
            id: data.id,
            protocol: data.protocol,
            status: data.status,
        };
    }

    async generateLabel(shippingOrderId: string): Promise<ShippingLabelResult> {
        await firstValueFrom(
            this.httpService.post(
                `${this.apiUrl}/me/shipment/generate`,
                { orders: [shippingOrderId] },
                { headers: this.headers },
            ),
        );

        const { data } = await firstValueFrom(
            this.httpService.post(
                `${this.apiUrl}/me/shipment/print`,
                { orders: [shippingOrderId] },
                { headers: this.headers },
            ),
        );

        return { url: data.url };
    }

    async getTracking(shippingOrderId: string): Promise<TrackingResult> {
        const { data } = await firstValueFrom(
            this.httpService.post(
                `${this.apiUrl}/me/shipment/tracking`,
                { orders: [shippingOrderId] },
                { headers: this.headers },
            ),
        );

        const tracking = data[shippingOrderId];

        return {
            id: shippingOrderId,
            status: tracking?.status ?? 'unknown',
            trackingCode: tracking?.tracking ?? '',
            events:
                tracking?.melhorenvio_tracking?.map((event: any) => ({
                    date: event.date,
                    description: event.description,
                    location: event.location,
                })) ?? [],
        };
    }
}
