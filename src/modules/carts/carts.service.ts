import { Injectable } from '@nestjs/common';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { CartStatus } from '@prisma/client';

@Injectable()
export class CartsService {
    constructor(private readonly prisma: PrismaService) {}

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

        const cartItem = await this.prisma.cartItem.create({
            data: {
                cartId: cart.id,
                bagId: createCartDto.bagId,
                bagColorId: createCartDto.bagColorId,
                quantity: createCartDto.quantity || 1,
            }
        })
        
        return cartItem;
    }

    findAll() {
        return `This action returns all carts`;
    }

    findOne(id: number) {
        return `This action returns a #${id} cart`;
    }

    update(id: number, updateCartDto: UpdateCartDto) {
        return `This action updates a #${id} cart`;
    }

    remove(id: number) {
        return `This action removes a #${id} cart`;
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
                        bagColor: {
                            select: {
                                id: true,
                                colorName: true,
                            },
                        },
                        bag: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    }
                },
            }
        });

        const totalItems = cart?.items.reduce((acc, item) => acc + item.quantity, 0);

        return {
            cart,
            totalItems,
        }
    }
}
