import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createHash, randomUUID } from 'crypto';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'products');

@Injectable()
export class ProductsService {

    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    async create(dto: CreateProductDto, files: Express.Multer.File[]) {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });

        const filesByColor = new Map<number, Express.Multer.File[]>();
        for (const file of files) {
            const match = file.fieldname.match(/^colors\[(\d+)]\[images]$/);
            if (!match) continue;

            const idx = parseInt(match[1], 10);
            if (!filesByColor.has(idx)) filesByColor.set(idx, []);
            filesByColor.get(idx)!.push(file);
        }

        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    category: dto.category,
                    modelCode: dto.modelCode,
                    name: dto.name,
                    description: dto.description,
                    material: dto.material,
                    size: dto.size,
                    price: dto.price,
                    promotionPrice: dto.promotionPrice,
                    isPromotion: dto.isPromotion ?? false,
                    colors: {
                        create: dto.colors.map((color) => ({
                            colorName: color.colorName,
                            hexCode: color.hexCode,
                            stockQuantity: color.stockQuantity ?? 0,
                        })),
                    },
                },
                include: { colors: true },
            });

            for (let i = 0; i < product.colors.length; i++) {
                const colorFiles = filesByColor.get(i) ?? [];
                const productColor = product.colors[i];

                for (let j = 0; j < colorFiles.length; j++) {
                    const file = colorFiles[j];
                    const ext = path.extname(file.originalname);
                    const filename = `${randomUUID()}${ext}`;
                    const filePath = path.join(UPLOADS_DIR, filename);

                    await fs.writeFile(filePath, file.buffer);

                    await tx.image.create({
                        data: {
                            productColorId: productColor.id,
                            url: `/uploads/products/${filename}`,
                            altText: `${product.name} - ${productColor.colorName}`,
                            displayOrder: j,
                        },
                    });
                }
            }

            return tx.product.findUnique({
                where: { id: product.id },
                include: {
                    colors: {
                        include: { images: true },
                    },
                },
            });
        });
    }

    async findAll(query: FilterProductsDto, isAdmin: boolean) {
        const ttl = this.configService.get<number>('CACHE_TTL_MS', 60_000);
        const cacheKey = this.productsListCacheKey(query, isAdmin);

        return this.cacheManager.wrap(
            cacheKey,
            () => this.fetchProductsList(query, isAdmin),
            ttl,
        );
    }

    private productsListCacheKey(query: FilterProductsDto, isAdmin: boolean): string {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const payload = JSON.stringify({
            isAdmin,
            category: query.category ?? null,
            name: query.name ?? null,
            date: query.date ?? null,
            price: query.price ?? null,
            size: query.size ?? null,
            page,
            limit,
        });
        const hash = createHash('sha256').update(payload).digest('hex').slice(0, 32);
        return `products:list:${hash}`;
    }

    private async fetchProductsList(query: FilterProductsDto, isAdmin: boolean) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.ProductWhereInput = {};
        const orderBy: Prisma.ProductOrderByWithRelationInput = {};

        if (query.category) where.category = query.category as any;

        if (isAdmin) {
            if (query.name) where.name = { contains: query.name, mode: 'insensitive' };
            if (query.size) where.size = query.size as any;

            if (query.date) orderBy.createdAt = query.date;
            if (query.price) orderBy.price = query.price;
        }

        const products = await this.prisma.product.findMany({
            skip,
            take: limit,
            where,
            orderBy,
            include: {
                colors: {
                    include: { images: true },
                },
            },
        });

        const total = await this.prisma.product.count({ where });

        return {
            data: products,
            total,
            page,
            limit,
        };
    }

    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                colors: {
                    include: { images: true },
                },
            },
        });

        if (!product) throw new NotFoundException('Product not found');

        return product;
    }

    async update(id: string, updateProductDto: UpdateProductDto, files: Express.Multer.File[]) {
        const { colors, ...productData } = updateProductDto;

        return this.prisma.$transaction(async (tx) => {
            const product = await tx.product.update({
                where: { id },
                data: productData,
            });

            for (const file of files) {
                const ext = path.extname(file.originalname);
                const filename = `${randomUUID()}${ext}`;
                const filePath = path.join(UPLOADS_DIR, filename);

                await fs.writeFile(filePath, file.buffer);
            }

            return product;
        });
    }

    remove(id: number) {
        return `This action removes a #${id} product`;
    }
}
