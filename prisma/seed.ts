import 'dotenv/config';
import {
  PrismaClient,
  UserRole,
  OrderStatus,
  BagSize,
  CartStatus,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log('Seeding database...');

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.image.deleteMany();
  await prisma.bagColor.deleteMany();
  await prisma.bag.deleteMany();
  await prisma.address.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await argon2.hash('Password123!MapleLeaf123456');

  // ── Users (UserRole: ADMIN, EMPLOYEE, CLIENT) ────────────────────

  const admin = await prisma.user.create({
    data: {
      email: 'admin@mapleleaf.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
      name: 'Admin',
    },
  });

  const employee = await prisma.user.create({
    data: {
      email: 'employee@mapleleaf.com',
      password: hashedPassword,
      role: UserRole.EMPLOYEE,
      name: 'Maria Silva',
      phone: '11999990000',
    },
  });

  const client1 = await prisma.user.create({
    data: {
      email: 'anacosta@gmail.com',
      password: hashedPassword,
      role: UserRole.CLIENT,
      name: 'Ana Costa',
      cpf: '12345678900',
      phone: '11988887777',
    },
  });

  const client2 = await prisma.user.create({
    data: {
      email: 'joao@gmail.com',
      password: hashedPassword,
      role: UserRole.CLIENT,
      name: 'João Oliveira',
      cpf: '98765432100',
      phone: '21977776666',
    },
  });

  console.log('Users created');

  // ── RefreshTokens (User → RefreshToken) ──────────────────────────

  await prisma.refreshToken.createMany({
    data: [
      {
        token: 'rt_admin_seed_token_abc123',
        userId: admin.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        token: 'rt_client1_seed_token_def456',
        userId: client1.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        token: 'rt_client2_expired_token_ghi789',
        userId: client2.id,
        expiresAt: new Date('2026-01-01'),
      },
    ],
  });

  console.log('Refresh tokens created');

  // ── Addresses (User → Address) ───────────────────────────────────

  const addr1 = await prisma.address.create({
    data: {
      userId: client1.id,
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apto 45',
      district: 'Jardim Paulista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01401-000',
      isDefault: true,
      label: 'Casa',
    },
  });

  const addr2 = await prisma.address.create({
    data: {
      userId: client1.id,
      street: 'Av. Brasil',
      number: '456',
      district: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
      label: 'Trabalho',
    },
  });

  const addr3 = await prisma.address.create({
    data: {
      userId: client2.id,
      street: 'Rua Copacabana',
      number: '789',
      complement: 'Bloco B',
      district: 'Copacabana',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '22041-080',
      isDefault: true,
      label: 'Casa',
    },
  });

  console.log('Addresses created');

  // ── Bags (BagSize: MINI, SMALL, MEDIUM, LARGE) ──────────────────
  // Bag → BagColor → Image (nested relations)

  const bagMedium = await prisma.bag.create({
    data: {
      modelCode: 'CHN-001',
      name: 'Bolsa Elegance',
      description:
        'Bolsa de mão sofisticada, perfeita para eventos formais. Acabamento premium com detalhes dourados.',
      material: 'Couro Sintético',
      size: BagSize.MEDIUM,
      price: 299.9,
      colors: {
        create: [
          {
            colorName: 'Preto',
            hexCode: '#000000',
            stockQuantity: 25,
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x400/000/fff?text=Elegance+Preto+1',
                  altText: 'Bolsa Elegance Preto - Frente',
                  displayOrder: 0,
                },
                {
                  url: 'https://placehold.co/600x400/000/fff?text=Elegance+Preto+2',
                  altText: 'Bolsa Elegance Preto - Lateral',
                  displayOrder: 1,
                },
              ],
            },
          },
          {
            colorName: 'Vermelho',
            hexCode: '#C41E3A',
            stockQuantity: 20,
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x400/C41E3A/fff?text=Elegance+Vermelho',
                  altText: 'Bolsa Elegance Vermelho - Frente',
                  displayOrder: 0,
                },
              ],
            },
          },
        ],
      },
    },
    include: { colors: true },
  });

  const bagLarge = await prisma.bag.create({
    data: {
      modelCode: 'CHN-002',
      name: 'Bolsa Urban',
      description:
        'Bolsa casual para o dia a dia. Design moderno com compartimentos práticos e alça ajustável.',
      material: 'Nylon Impermeável',
      size: BagSize.LARGE,
      price: 189.9,
      isPromotion: true,
      promotionPrice: 149.9,
      colors: {
        create: [
          {
            colorName: 'Azul Marinho',
            hexCode: '#1B2A4A',
            stockQuantity: 40,
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x400/1B2A4A/fff?text=Urban+Azul',
                  altText: 'Bolsa Urban Azul Marinho',
                  displayOrder: 0,
                },
              ],
            },
          },
          {
            colorName: 'Cinza',
            hexCode: '#808080',
            stockQuantity: 35,
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x400/808080/fff?text=Urban+Cinza',
                  altText: 'Bolsa Urban Cinza',
                  displayOrder: 0,
                },
              ],
            },
          },
          {
            colorName: 'Verde Militar',
            hexCode: '#4B5320',
            stockQuantity: 30,
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x400/4B5320/fff?text=Urban+Verde',
                  altText: 'Bolsa Urban Verde Militar',
                  displayOrder: 0,
                },
              ],
            },
          },
        ],
      },
    },
    include: { colors: true },
  });

  const bagMini = await prisma.bag.create({
    data: {
      modelCode: 'CHN-003',
      name: 'Mini Bag Charm',
      description:
        'Mini bolsa charmosa para sair à noite. Acompanha corrente dourada removível.',
      material: 'Couro Legítimo',
      size: BagSize.MINI,
      price: 399.9,
      colors: {
        create: [
          {
            colorName: 'Rosa',
            hexCode: '#FF69B4',
            stockQuantity: 15,
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x400/FF69B4/fff?text=Charm+Rosa',
                  altText: 'Mini Bag Charm Rosa',
                  displayOrder: 0,
                },
              ],
            },
          },
          {
            colorName: 'Dourado',
            hexCode: '#DAA520',
            stockQuantity: 12,
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x400/DAA520/fff?text=Charm+Dourado',
                  altText: 'Mini Bag Charm Dourado',
                  displayOrder: 0,
                },
              ],
            },
          },
        ],
      },
    },
    include: { colors: true },
  });

  const bagLarge2 = await prisma.bag.create({
    data: {
      modelCode: 'CHN-004',
      name: 'Bolsa Work',
      description:
        'Bolsa executiva com espaço para notebook de até 15". Ideal para o ambiente profissional.',
      material: 'Couro Sintético Premium',
      size: BagSize.LARGE,
      price: 349.9,
      isPromotion: true,
      promotionPrice: 279.9,
      colors: {
        create: [
          {
            colorName: 'Caramelo',
            hexCode: '#C68E17',
            stockQuantity: 40,
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x400/C68E17/fff?text=Work+Caramelo',
                  altText: 'Bolsa Work Caramelo',
                  displayOrder: 0,
                },
              ],
            },
          },
          {
            colorName: 'Preto',
            hexCode: '#000000',
            stockQuantity: 35,
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x400/000/fff?text=Work+Preto',
                  altText: 'Bolsa Work Preto',
                  displayOrder: 0,
                },
              ],
            },
          },
        ],
      },
    },
    include: { colors: true },
  });

  const bagSmall = await prisma.bag.create({
    data: {
      modelCode: 'CHN-005',
      name: 'Clutch Festa',
      description:
        'Clutch brilhante para festas e ocasiões especiais. Fecho magnético com acabamento em strass.',
      material: 'Cetim com Strass',
      size: BagSize.SMALL,
      price: 199.9,
      colors: {
        create: [
          {
            colorName: 'Prata',
            hexCode: '#C0C0C0',
            stockQuantity: 25,
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x400/C0C0C0/333?text=Clutch+Prata',
                  altText: 'Clutch Festa Prata',
                  displayOrder: 0,
                },
              ],
            },
          },
          {
            colorName: 'Preto',
            hexCode: '#000000',
            stockQuantity: 20,
            images: {
              create: [
                {
                  url: 'https://placehold.co/600x400/000/fff?text=Clutch+Preto',
                  altText: 'Clutch Festa Preto',
                  displayOrder: 0,
                },
              ],
            },
          },
        ],
      },
    },
    include: { colors: true },
  });

  console.log('Bags with colors and images created');

  const color = (
    bag: { colors: { colorName: string; id: string }[] },
    name: string,
  ) => bag.colors.find((c) => c.colorName === name)!;

  // ── Carts (CartStatus: ACTIVE, CHECKED_OUT) ─────────────────────
  // Cart → CartItem → Bag + BagColor

  const activeCart = await prisma.cart.create({
    data: {
      userId: client1.id,
      status: CartStatus.ACTIVE,
      items: {
        create: [
          {
            bagId: bagMedium.id,
            bagColorId: color(bagMedium, 'Preto').id,
            quantity: 1,
          },
          {
            bagId: bagLarge.id,
            bagColorId: color(bagLarge, 'Azul Marinho').id,
            quantity: 2,
          },
        ],
      },
    },
  });

  const checkedOutCart = await prisma.cart.create({
    data: {
      userId: client2.id,
      status: CartStatus.CHECKED_OUT,
      items: {
        create: [
          {
            bagId: bagLarge.id,
            bagColorId: color(bagLarge, 'Cinza').id,
            quantity: 1,
          },
          {
            bagId: bagMini.id,
            bagColorId: color(bagMini, 'Rosa').id,
            quantity: 1,
          },
        ],
      },
    },
  });

  console.log('Carts created');

  // ── Orders (OrderStatus: PENDING, PROCESSING, COMPLETED, CANCELLED)
  // Order → OrderItem, Order → Address, Order → Cart, Order → User (completedBy)

  await prisma.order.create({
    data: {
      userId: client1.id,
      addressId: addr1.id,
      orderNumber: 'ORD-2026-0001',
      status: OrderStatus.COMPLETED,
      trackingCode: 'BR123456789ML',
      subtotal: 599.8,
      shippingCost: 25.0,
      discount: 0,
      totalAmount: 624.8,
      paymentMethod: 'PIX',
      paymentStatus: 'PAID',
      completedAt: new Date('2026-03-05'),
      completedById: employee.id,
      items: {
        create: [
          {
            bagId: bagMedium.id,
            quantity: 2,
            selectedColor: 'Preto',
            unitPrice: 299.9,
            subtotal: 599.8,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      userId: client2.id,
      addressId: addr3.id,
      cartId: checkedOutCart.id,
      orderNumber: 'ORD-2026-0002',
      status: OrderStatus.PROCESSING,
      trackingCode: 'BR987654321ML',
      subtotal: 549.8,
      shippingCost: 30.0,
      discount: 50.0,
      totalAmount: 529.8,
      paymentMethod: 'CREDIT_CARD',
      paymentStatus: 'PAID',
      items: {
        create: [
          {
            bagId: bagLarge.id,
            quantity: 1,
            selectedColor: 'Cinza',
            unitPrice: 149.9,
            subtotal: 149.9,
          },
          {
            bagId: bagMini.id,
            quantity: 1,
            selectedColor: 'Rosa',
            unitPrice: 399.9,
            subtotal: 399.9,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      userId: client1.id,
      addressId: addr2.id,
      orderNumber: 'ORD-2026-0003',
      status: OrderStatus.PENDING,
      subtotal: 279.9,
      shippingCost: 15.0,
      discount: 0,
      totalAmount: 294.9,
      paymentMethod: null,
      paymentStatus: 'AWAITING',
      items: {
        create: [
          {
            bagId: bagLarge2.id,
            quantity: 1,
            selectedColor: 'Caramelo',
            unitPrice: 279.9,
            subtotal: 279.9,
          },
        ],
      },
    },
  });

  await prisma.order.create({
    data: {
      userId: client2.id,
      addressId: addr3.id,
      orderNumber: 'ORD-2026-0004',
      status: OrderStatus.CANCELLED,
      subtotal: 199.9,
      shippingCost: 20.0,
      discount: 0,
      totalAmount: 219.9,
      paymentMethod: 'BOLETO',
      paymentStatus: 'REFUNDED',
      items: {
        create: [
          {
            bagId: bagSmall.id,
            quantity: 1,
            selectedColor: 'Prata',
            unitPrice: 199.9,
            subtotal: 199.9,
          },
        ],
      },
    },
  });

  console.log('Orders created');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
