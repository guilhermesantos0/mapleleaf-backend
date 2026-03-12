import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderObjectResponse } from './types/order-response.type';
import { OrderStatus } from '@prisma/client';

type AdminGetOrdersResponse = {
    data: OrderObjectResponse[]; 
    currentPage: number;
    lastPage: number;
    total: number;
}

@Injectable()
export class OrdersService {
    constructor(private readonly prisma: PrismaService) {}

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
                totalItems: true,
                status: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        phone: true,
                        name: true
                    }
                },
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        selectedColor: true,
                        bag: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
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
                            }
                        },
                        trackingCode: true,
                    }
                }
            }
        });

        const total = await this.prisma.cart.count({
            where: rest,
        });

        return {
            data: carts.map((cart) => ({
                id: cart.id,
                order: cart.orders[0],
                totalItems: cart.totalItems,
                status: cart.status,
                cartItems: cart.items,
                user: cart.user,
            })),
            currentPage: Number(page),
            lastPage: Math.ceil(total / Number(limit)),
            total,
        }
    }

    async getOrderById(id: string): Promise<OrderObjectResponse> {
        const cart = await this.prisma.cart.findUnique({
            where: { id },
            select: {
                id: true,
                totalItems: true,
                status: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true,
                        phone: true,
                        name: true
                    }
                },
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        selectedColor: true,
                        bag: {
                            select: {
                                id: true,
                                name: true,
                            }
                        }
                    }
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
                            }
                        },
                        trackingCode: true
                    }
                }
            }
        })

        if (!cart) {
            throw new NotFoundException('Order not found');
        }

        return {
            id: cart.id,
            order: cart.orders[0],
            totalItems: cart.totalItems,
            status: cart.status,
            cartItems: cart.items,
            user: cart.user,
        };
    }

    async updateOrder(id: string, body: any): Promise<any> {
        const order = await this.prisma.order.update({
            where: { id },
            data: body,
        })

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    async cancelOrder(id: string): Promise<any> {
        const order = await this.prisma.order.update({
            where: { id },
            data: { status: OrderStatus.CANCELLED },
        })

        return order;
    }
}
