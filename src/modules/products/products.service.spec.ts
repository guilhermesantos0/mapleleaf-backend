import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('fs/promises', () => ({
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn().mockResolvedValue(undefined),
}));

describe('ProductsService', () => {
    let service: ProductsService;
    let tx: {
        product: { findUnique: jest.Mock; update: jest.Mock };
        productColor: {
            update: jest.Mock;
            create: jest.Mock;
            deleteMany: jest.Mock;
        };
        image: { create: jest.Mock; aggregate: jest.Mock };
    };
    let prisma: { $transaction: jest.Mock };
    let cache: { set: jest.Mock; get: jest.Mock; del: jest.Mock };

    beforeEach(async () => {
        tx = {
            product: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            productColor: {
                update: jest.fn(),
                create: jest.fn(),
                deleteMany: jest.fn(),
            },
            image: {
                create: jest.fn(),
                aggregate: jest
                    .fn()
                    .mockResolvedValue({ _max: { displayOrder: null } }),
            },
        };

        prisma = {
            $transaction: jest.fn((cb: (tx: unknown) => unknown) => cb(tx)),
        };

        cache = {
            set: jest.fn(),
            get: jest.fn(),
            del: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductsService,
                { provide: PrismaService, useValue: prisma },
                { provide: ConfigService, useValue: { get: () => 60_000 } },
                { provide: CACHE_MANAGER, useValue: cache },
            ],
        }).compile();

        service = module.get<ProductsService>(ProductsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('update', () => {
        it('lança NotFoundException quando o produto não existe', async () => {
            tx.product.findUnique.mockResolvedValueOnce(null);

            await expect(
                service.update('missing', {}, []),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it('atualiza cor existente, cria nova e remove ausente', async () => {
            // 1ª chamada: busca inicial com cores existentes.
            tx.product.findUnique
                .mockResolvedValueOnce({
                    id: 'prod-1',
                    colors: [{ id: 'color-keep' }, { id: 'color-remove' }],
                })
                // 2ª chamada: retorno final com include.
                .mockResolvedValueOnce({ id: 'prod-1', colors: [] });

            tx.product.update.mockResolvedValue({
                id: 'prod-1',
                name: 'Produto',
            });
            tx.productColor.update.mockResolvedValue({ id: 'color-keep' });
            tx.productColor.create.mockResolvedValue({ id: 'color-new' });

            await service.update(
                'prod-1',
                {
                    name: 'Produto',
                    colors: [
                        {
                            id: 'color-keep',
                            colorName: 'Preta',
                            stockQuantity: 5,
                        },
                        { colorName: 'Caramelo', stockQuantity: 3 },
                    ],
                },
                [],
            );

            expect(tx.productColor.update).toHaveBeenCalledWith({
                where: { id: 'color-keep' },
                data: expect.objectContaining({ colorName: 'Preta' }),
            });
            expect(tx.productColor.create).toHaveBeenCalledTimes(1);
            expect(tx.productColor.deleteMany).toHaveBeenCalledWith({
                where: { id: { in: ['color-remove'] } },
            });
        });

        it('mantém as cores intactas quando colors não é enviado', async () => {
            tx.product.findUnique
                .mockResolvedValueOnce({ id: 'prod-1', colors: [{ id: 'c1' }] })
                .mockResolvedValueOnce({ id: 'prod-1', colors: [] });
            tx.product.update.mockResolvedValue({ id: 'prod-1', name: 'P' });

            await service.update('prod-1', { name: 'P' }, []);

            expect(tx.productColor.update).not.toHaveBeenCalled();
            expect(tx.productColor.create).not.toHaveBeenCalled();
            expect(tx.productColor.deleteMany).not.toHaveBeenCalled();
        });
    });
});
