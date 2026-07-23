import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingService } from 'src/integrations/shipping/shipping.service';

describe('OrdersService', () => {
    let service: OrdersService;
    let prisma: {
        order: { findUnique: jest.Mock; update: jest.Mock };
        cart: { findMany: jest.Mock; count: jest.Mock };
    };

    beforeEach(async () => {
        prisma = {
            order: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            cart: {
                findMany: jest.fn(),
                count: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                { provide: PrismaService, useValue: prisma },
                {
                    provide: ShippingService,
                    useValue: { calculateShipping: jest.fn() },
                },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('updateOrder', () => {
        it('lança NotFoundException quando o pedido não existe', async () => {
            prisma.order.findUnique.mockResolvedValue(null);

            await expect(
                service.updateOrder('missing-id', {
                    status: OrderStatus.CONFIRMED,
                }),
            ).rejects.toBeInstanceOf(NotFoundException);

            expect(prisma.order.update).not.toHaveBeenCalled();
        });

        it('atualiza apenas trackingCode e status', async () => {
            prisma.order.findUnique.mockResolvedValue({ id: 'order-1' });
            prisma.order.update.mockResolvedValue({ id: 'order-1' });

            await service.updateOrder('order-1', {
                trackingCode: 'BR123',
                status: OrderStatus.CONFIRMED,
            });

            expect(prisma.order.update).toHaveBeenCalledWith({
                where: { id: 'order-1' },
                data: {
                    trackingCode: 'BR123',
                    status: OrderStatus.CONFIRMED,
                },
            });
        });
    });

    describe('getOrders', () => {
        it('traduz os filtros para um where do Prisma restrito a carrinhos finalizados', async () => {
            prisma.cart.findMany.mockResolvedValue([]);
            prisma.cart.count.mockResolvedValue(0);

            await service.getOrders({
                page: 2,
                limit: 10,
                customerName: 'joão',
                status: OrderStatus.PENDING,
                startDate: '2026-01-01',
                endDate: '2026-01-31',
            });

            const args = prisma.cart.findMany.mock.calls[0][0] as {
                skip: number;
                take: number;
                where: {
                    status: string;
                    user?: unknown;
                    orders?: unknown;
                    createdAt?: { gte?: Date; lte?: Date };
                };
            };
            expect(args.skip).toBe(10);
            expect(args.take).toBe(10);
            expect(args.where.status).toBe('CHECKED_OUT');
            expect(args.where.user).toEqual({
                name: { contains: 'joão', mode: 'insensitive' },
            });
            expect(args.where.orders).toEqual({
                some: { status: OrderStatus.PENDING },
            });
            expect(args.where.createdAt?.gte).toBeInstanceOf(Date);
            expect(args.where.createdAt?.lte).toBeInstanceOf(Date);
        });
    });
});
