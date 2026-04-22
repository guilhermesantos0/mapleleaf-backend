import { OrderStatus, ProductCategory, UserRole } from '@prisma/client';

type SelectedAddress = {
    id: string;
    street: string;
    number: string;
    complement: string | null;
    district: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
};

type SelectedOrder = {
    orderNumber: string;
    status: OrderStatus;
    subtotal: any;
    shippingCost: any;
    discount: any;
    totalAmount: any;
    paymentMethod: string | null;
    address: SelectedAddress;
    trackingCode: string | null;
};

type SelectedCartItem = {
    id: string;
    quantity: number;
    productColor: { id: string; colorName: string };
    product: { id: string; name: string; category: ProductCategory };
};

type SelectedUser = {
    id: string;
    email: string;
    role: UserRole;
    phone: string | null;
    name: string | null;
};

export type OrderObjectResponse = {
    id: string;
    order?: SelectedOrder;
    totalItems: number;
    status: string;
    cartItems: SelectedCartItem[];
    user: SelectedUser;
};
