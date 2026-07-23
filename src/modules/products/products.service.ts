import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
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

const PRODUCTS_LIST_VERSION_KEY = 'products:list:version';

@Injectable()
export class ProductsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    private groupFilesByColor(
        files: Express.Multer.File[],
    ): Map<number, Express.Multer.File[]> {
        const filesByColor = new Map<number, Express.Multer.File[]>();
        for (const file of files) {
            const match = file.fieldname.match(/^colors\[(\d+)]\[images]\[]$/);
            if (!match) continue;

            const idx = parseInt(match[1], 10);
            if (!filesByColor.has(idx)) filesByColor.set(idx, []);
            filesByColor.get(idx)!.push(file);
        }
        return filesByColor;
    }

    private async persistColorImages(
        tx: Prisma.TransactionClient,
        productColorId: string,
        productName: string,
        colorName: string,
        files: Express.Multer.File[],
        startOrder = 0,
    ) {
        for (let j = 0; j < files.length; j++) {
            const file = files[j];
            const ext = path.extname(file.originalname);
            const filename = `${randomUUID()}${ext}`;
            const filePath = path.join(UPLOADS_DIR, filename);

            await fs.writeFile(filePath, file.buffer);

            await tx.image.create({
                data: {
                    productColorId,
                    url: `/uploads/products/${filename}`,
                    altText: `${productName} - ${colorName}`,
                    displayOrder: startOrder + j,
                },
            });
        }
    }

    async create(dto: CreateProductDto, files: Express.Multer.File[]) {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });

        const filesByColor = this.groupFilesByColor(files);

        const result = await this.prisma.$transaction(async (tx) => {
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
                    isHighlighted: dto.isHighlighted ?? false,
                    releaseDate: dto.releaseDate,
                    defaultBoxWidth: dto.defaultBoxWidth,
                    defaultBoxHeight: dto.defaultBoxHeight,
                    defaultBoxLength: dto.defaultBoxLength,
                    defaultBoxWeight: dto.defaultBoxWeight,
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

                await this.persistColorImages(
                    tx,
                    productColor.id,
                    product.name,
                    productColor.colorName,
                    colorFiles,
                );
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

        await this.invalidateProductsCache();
        return result;
    }

    async findAll(query: FilterProductsDto, isAdmin: boolean) {
        const ttl = this.configService.get<number>('CACHE_TTL_MS', 60_000);
        const listVersion = await this.getListCacheVersion();
        const cacheKey = this.productsListCacheKey(query, isAdmin, listVersion);

        return this.cacheManager.wrap(
            cacheKey,
            () => this.fetchProductsList(query, isAdmin),
            ttl,
        );
    }

    private async invalidateProductsCache(productId?: string) {
        await this.cacheManager.set(
            PRODUCTS_LIST_VERSION_KEY,
            String(Date.now()),
            0,
        );
        if (productId) {
            await this.cacheManager.del(this.productsCacheKey(productId));
        }
    }

    private async getListCacheVersion(): Promise<string> {
        const v = await this.cacheManager.get<string>(
            PRODUCTS_LIST_VERSION_KEY,
        );
        return v ?? '0';
    }

    private productsListCacheKey(
        query: FilterProductsDto,
        isAdmin: boolean,
        listVersion: string,
    ): string {
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
        const hash = createHash('sha256')
            .update(payload)
            .digest('hex')
            .slice(0, 32);
        return `products:list:v${listVersion}:${hash}`;
    }

    private async fetchProductsList(
        query: FilterProductsDto,
        isAdmin: boolean,
    ) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        const where: Prisma.ProductWhereInput = {};
        const orderBy: Prisma.ProductOrderByWithRelationInput = {};

        if (query.category) where.category = query.category as any;

        if (isAdmin) {
            if (query.name)
                where.name = { contains: query.name, mode: 'insensitive' };
            if (query.size) where.size = query.size;

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

    private productsCacheKey(id: string): string {
        return `product:${id}`;
    }

    private async fetchProduct(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
            include: {
                colors: {
                    include: { images: true },
                },
            },
        });

        return product;
    }

    async findOne(id: string) {
        const ttl = this.configService.get<number>('CACHE_TTL_MS', 60_000);
        const cacheKey = this.productsCacheKey(id);

        return this.cacheManager.wrap(
            cacheKey,
            () => this.fetchProduct(id),
            ttl,
        );
    }

    async update(
        id: string,
        updateProductDto: UpdateProductDto,
        files: Express.Multer.File[],
    ) {
        await fs.mkdir(UPLOADS_DIR, { recursive: true });

        const { colors, ...productData } = updateProductDto;
        const filesByColor = this.groupFilesByColor(files);

        const result = await this.prisma.$transaction(async (tx) => {
            const existing = await tx.product.findUnique({
                where: { id },
                include: { colors: true },
            });

            if (!existing) {
                throw new NotFoundException('Produto não encontrado');
            }

            const product = await tx.product.update({
                where: { id },
                data: productData,
            });

            // Se `colors` não vier no payload, mantém as cores existentes intactas.
            if (colors) {
                const keptColorIds = new Set<string>();

                for (let i = 0; i < colors.length; i++) {
                    const color = colors[i];
                    const colorFiles = filesByColor.get(i) ?? [];

                    let productColorId: string;

                    if (color.id) {
                        // Cor existente: atualiza dados escalares.
                        const updated = await tx.productColor.update({
                            where: { id: color.id },
                            data: {
                                colorName: color.colorName,
                                hexCode: color.hexCode,
                                stockQuantity: color.stockQuantity ?? 0,
                            },
                        });
                        productColorId = updated.id;
                    } else {
                        // Nova cor.
                        const created = await tx.productColor.create({
                            data: {
                                productId: id,
                                colorName: color.colorName,
                                hexCode: color.hexCode,
                                stockQuantity: color.stockQuantity ?? 0,
                            },
                        });
                        productColorId = created.id;
                    }

                    keptColorIds.add(productColorId);

                    if (colorFiles.length > 0) {
                        const currentMax = await tx.image.aggregate({
                            where: { productColorId },
                            _max: { displayOrder: true },
                        });
                        const startOrder =
                            (currentMax._max.displayOrder ?? -1) + 1;

                        await this.persistColorImages(
                            tx,
                            productColorId,
                            product.name,
                            color.colorName,
                            colorFiles,
                            startOrder,
                        );
                    }
                }

                // Remove cores que não constam mais no payload (cascade remove imagens).
                const toRemove = existing.colors
                    .filter((c) => !keptColorIds.has(c.id))
                    .map((c) => c.id);

                if (toRemove.length > 0) {
                    await tx.productColor.deleteMany({
                        where: { id: { in: toRemove } },
                    });
                }
            }

            return tx.product.findUnique({
                where: { id },
                include: {
                    colors: {
                        include: { images: true },
                    },
                },
            });
        });

        await this.invalidateProductsCache(id);
        return result;
    }

    async remove(id: string) {
        await this.prisma.product.delete({ where: { id } });
        await this.invalidateProductsCache(id);
    }
}
