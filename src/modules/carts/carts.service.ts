import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { CartStatus } from '@prisma/client';
import { ShippingService } from 'src/integrations/shipping/shipping.service';

@Injectable()
export class CartsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly shippingService: ShippingService,
    ) {}

    async addToCart(createCartDto: CreateCartDto, userId: string) {
        let cart = await this.prisma.cart.findFirst({
            where: {
                userId,
                status: CartStatus.ACTIVE,
            },
        });

        if (!cart) {
            cart = await this.prisma.cart.create({
                data: {
                    userId,
                    status: CartStatus.ACTIVE,
                },
            });
        }

        const existingCartItem = await this.prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                productId: createCartDto.productId,
                productColorId: createCartDto.productColorId,
            },
        });

        if (existingCartItem) {
            await this.prisma.cartItem.update({
                where: { id: existingCartItem.id },
                data: {
                    quantity:
                        existingCartItem.quantity +
                        (createCartDto.quantity || 1),
                },
            });
        } else {
            await this.prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId: createCartDto.productId,
                    productColorId: createCartDto.productColorId,
                    quantity: createCartDto.quantity || 1,
                },
            });
        }

        const userCart = await this.findByUserId(userId);

        return userCart;
    }

    async removeItem(id: string, userId: string, quantity?: number) {
        const cartItem = await this.prisma.cartItem.findFirst({
            where: {
                id,
                cart: {
                    userId,
                },
            },
        });

        if (!cartItem)
            throw new NotFoundException('Item do carrinho não encontrado');

        if (quantity) {
            if (quantity > cartItem.quantity)
                throw new BadRequestException(
                    'A quantidade é maior que a quantidade disponível',
                );
            if (quantity === cartItem.quantity) {
                await this.prisma.cartItem.delete({
                    where: { id },
                });
            }
            await this.prisma.cartItem.update({
                where: { id },
                data: { quantity: cartItem.quantity - quantity },
            });
        } else {
            await this.prisma.cartItem.delete({
                where: { id },
            });
        }

        return this.findByUserId(userId);
    }

    async updateItemQuantity(id: string, userId: string, quantity: number) {
        const cartItem = await this.prisma.cartItem.findFirst({
            where: { id, cart: { userId } },
        });

        if (!cartItem)
            throw new NotFoundException('Item do carrinho não encontrado');

        await this.prisma.cartItem.update({
            where: { id },
            data: { quantity },
        });

        return this.findByUserId(userId);
    }

    async clearUserCart(userId: string) {
        await this.prisma.cartItem.deleteMany({
            where: { cart: { userId } },
        });

        return this.findByUserId(userId);
    }

    async getShippingQuotes(userId: string, toZipCode: string) {
        const cart = await this.prisma.cart.findFirst({
            where: { userId, status: CartStatus.ACTIVE },
            include: {
                items: {
                    include: { product: true },
                },
            },
        });

        if (!cart || cart.items.length === 0) {
            throw new BadRequestException('Carrinho vazio');
        }

        const packages = cart.items.map((item) => ({
            width: Number(item.product.defaultBoxWidth),
            height: Number(item.product.defaultBoxHeight),
            length: Number(item.product.defaultBoxLength),
            weight: Number(item.product.defaultBoxWeight),
            quantity: item.quantity,
        }));

        return this.shippingService.calculateShipping(toZipCode, packages);
    }

    async findByUserId(userId: string) {
        const cart = await this.prisma.cart.findFirst({
            where: {
                userId,
                status: CartStatus.ACTIVE,
            },
            include: {
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
            },
        });

        const totalItems = cart?.items.reduce(
            (acc, item) => acc + item.quantity,
            0,
        );

        return {
            cart,
            totalItems,
        };
    }
}
