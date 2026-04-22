export interface ShippingPackage {
    width: number;
    height: number;
    length: number;
    weight: number;
    quantity: number;
}

export interface ShippingQuoteOption {
    id: number;
    name: string;
    company: {
        id: number;
        name: string;
        picture: string;
    };
    price: string;
    deliveryMin: number;
    deliveryMax: number;
    error?: string;
}

export interface ShippingOrderInput {
    serviceId: number;
    fromZipCode: string;
    toZipCode: string;
    packages: ShippingPackage[];
    products: ShippingProductInfo[];
    invoiceKey?: string;
}

export interface ShippingProductInfo {
    name: string;
    quantity: number;
    unitaryValue: number;
}

export interface ShippingOrderResult {
    id: string;
    protocol: string;
    status: string;
}

export interface ShippingLabelResult {
    url: string;
}

export interface TrackingResult {
    id: string;
    status: string;
    trackingCode: string;
    events: TrackingEvent[];
}

export interface TrackingEvent {
    date: string;
    description: string;
    location?: string;
}
