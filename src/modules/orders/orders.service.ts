import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderObjectResponse } from './types/order-response.type';
import { CartStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import { sumBy } from 'lodash';
import { ShippingService } from 'src/integrations/shipping/shipping.service';

type AdminGetOrdersResponse = {
    data: OrderObjectResponse[];
    currentPage: number;
    lastPage: number;
    total: number;
};

@Injectable()
export class OrdersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly shippingService: ShippingService,
    ) {}

    async getOrders(filters: any): Promise<AdminGetOrdersResponse> {
        const { page = 1, limit = 20, ...rest } = filters;
        const skip = (page - 1) * limit;

        const carts = await this.prisma.cart.findMany({
            skip,
            take: limit,
            where: rest,
            orderBy: {
                createdAt: 'desc',
            },
            select: {
                id: true,
                status: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        phone: true,
                        name: true,
                    },
                },
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        productColor: {
                            select: {
                                id: true,
                                colorName: true,
                            },
                        },
                        product: {
                            select: {
                                id: true,
                                name: true,
                                category: true,
                            },
                        },
                    },
                },
                orders: {
                    select: {
                        orderNumber: true,
                        status: true,
                        subtotal: true,
                        shippingCost: true,
                        discount: true,
                        totalAmount: true,
                        paymentMethod: true,
                        address: {
                            select: {
                                id: true,
                                street: true,
                                number: true,
                                complement: true,
                                district: true,
                                city: true,
                                state: true,
                                zipCode: true,
                                country: true,
                            },
                        },
                        trackingCode: true,
                    },
                },
            },
        });

        const total = await this.prisma.cart.count({
            where: rest,
        });

        return {
            data: carts.map((cart) => ({
                id: cart.id,
                order: cart.orders[0],
                totalItems: sumBy(cart.items, 'quantity'),
                status: cart.status,
                cartItems: cart.items,
                user: cart.user,
            })),
            currentPage: Number(page),
            lastPage: Math.ceil(total / Number(limit)),
            total,
        };
    }

    async getOrderById(id: string): Promise<OrderObjectResponse> {
        const totalItems = await this.prisma.cartItem.count({
            where: { cartId: id },
        });

        const cart = await this.prisma.cart.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        phone: true,
                        name: true,
                    },
                },
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        productColor: {
                            select: {
                                id: true,
                                colorName: true,
                            },
                        },
                        product: {
                            select: {
                                id: true,
                                name: true,
                                category: true,
                            },
                        },
                    },
                },
                orders: {
                    select: {
                        orderNumber: true,
                        status: true,
                        subtotal: true,
                        shippingCost: true,
                        discount: true,
                        totalAmount: true,
                        paymentMethod: true,
                        address: {
                            select: {
                                id: true,
                                street: true,
                                number: true,
                                complement: true,
                                district: true,
                                city: true,
                                state: true,
                                zipCode: true,
                                country: true,
                            },
                        },
                        trackingCode: true,
                    },
                },
            },
        });

        if (!cart) {
            throw new NotFoundException('Pedido não encontrado');
        }

        return {
            id: cart.id,
            order: cart.orders[0],
            totalItems,
            status: cart.status,
            cartItems: cart.items,
            user: cart.user,
        };
    }

    async updateOrder(id: string, body: any): Promise<any> {
        const order = await this.prisma.order.update({
            where: { id },
            data: body,
        });

        if (!order) {
            throw new NotFoundException('Pedido não encontrado');
        }

        return order;
    }

    async cancelOrder(id: string): Promise<any> {
        const order = await this.prisma.order.update({
            where: { id },
            data: { status: OrderStatus.CANCELLED },
        });

        return order;
    }

    async checkout(
        userId: string,
        addressId: string,
        shippingServiceId: number,
    ) {
        const cart = await this.prisma.cart.findFirst({
            where: { userId, status: CartStatus.ACTIVE },
            include: {
                items: {
                    include: {
                        product: true,
                        productColor: true,
                    },
                },
            },
        });

        if (!cart || cart.items.length === 0) {
            throw new BadRequestException('Carrinho vazio');
        }

        const address = await this.prisma.address.findFirst({
            where: { id: addressId, userId },
        });

        if (!address) {
            throw new NotFoundException('Endereço não encontrado');
        }

        const packages = cart.items.map((item) => ({
            width: Number(item.product.defaultBoxWidth),
            height: Number(item.product.defaultBoxHeight),
            length: Number(item.product.defaultBoxLength),
            weight: Number(item.product.defaultBoxWeight),
            quantity: item.quantity,
        }));

        const shippingQuotes = await this.shippingService.calculateShipping(
            address.zipCode,
            packages,
        );

        const selectedShipping = shippingQuotes.find(
            (q) => q.id === shippingServiceId,
        );

        if (!selectedShipping) {
            throw new BadRequestException('Serviço de frete inválido');
        }

        const subtotal = cart.items.reduce((sum, item) => {
            const price =
                item.product.isPromotion && item.product.promotionPrice
                    ? Number(item.product.promotionPrice)
                    : Number(item.product.price);
            return sum + price * item.quantity;
        }, 0);

        const shippingCost = parseFloat(selectedShipping.price);
        const totalAmount = subtotal + shippingCost;

        const orderNumber = `ML-${Date.now()}`;

        const order = await this.prisma.order.create({
            data: {
                userId,
                addressId,
                cartId: cart.id,
                orderNumber,
                status: OrderStatus.PENDING,
                paymentStatus: PaymentStatus.PENDING,
                subtotal,
                shippingCost,
                totalAmount,
                discount: 0,
                items: {
                    create: cart.items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        selectedColor: item.productColor.colorName,
                        unitPrice:
                            item.product.isPromotion &&
                            item.product.promotionPrice
                                ? item.product.promotionPrice
                                : item.product.price,
                        subtotal:
                            Number(
                                item.product.isPromotion &&
                                    item.product.promotionPrice
                                    ? item.product.promotionPrice
                                    : item.product.price,
                            ) * item.quantity,
                    })),
                },
            },
        });

        await this.prisma.cart.update({
            where: { id: cart.id },
            data: { status: CartStatus.CHECKED_OUT },
        });

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true },
        });

        return {
            orderId: order.id,
            orderNumber: order.orderNumber,
            totalAmount,
            payer: {
                email: user!.email,
                name: user?.name ?? null,
            },
        };
    }

    async getOrdersByUserId(userId: string): Promise<any> {
        const carts = await this.prisma.cart.findMany({
            where: { userId, status: CartStatus.CHECKED_OUT },
            select: {
                id: true,
                status: true,
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        productColor: {
                            select: {
                                id: true,
                                colorName: true,
                                hexCode: true,
                                stockQuantity: true,
                            },
                        },
                        product: {
                            select: {
                                id: true,
                                name: true,
                                category: true,
                                modelCode: true,
                                description: true,
                                material: true,
                                price: true,
                                promotionPrice: true,
                                isPromotion: true,
                                bagDetails: true,
                            },
                        },
                    },
                },
                orders: {
                    select: {
                        id: true,
                        status: true,
                        orderNumber: true,
                        subtotal: true,
                        shippingCost: true,
                        discount: true,
                        totalAmount: true,
                        paymentMethod: true,
                        paymentStatus: true,
                        completedAt: true,
                    },
                },
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        phone: true,
                        name: true,
                    },
                },
            },
        });

        return carts.map((cart) => ({
            id: cart.id,
            order: cart.orders[0],
            totalItems: sumBy(cart.items, 'quantity'),
            status: cart.status,
            cartItems: cart.items,
            user: cart.user,
        }));
    }
}
