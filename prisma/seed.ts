import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mapleleaf.com' },
    update: {},
    create: {
      email: 'admin@mapleleaf.com',
      password: '$2b$10$dummyHashedPasswordForDemo',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  const employee = await prisma.user.upsert({
    where: { email: 'employee@mapleleaf.com' },
    update: {},
    create: {
      email: 'employee@mapleleaf.com',
      password: '$2b$10$dummyHashedPasswordForDemo',
      role: 'EMPLOYEE',
      cpf: '12345678900',
      phone: '+55 11 98765-4321',
    },
  });
  console.log('✅ Created employee user:', employee.email);

  const client = await prisma.user.upsert({
    where: { email: 'client@example.com' },
    update: {},
    create: {
      email: 'client@example.com',
      password: '$2b$10$dummyHashedPasswordForDemo',
      role: 'CLIENT',
      cpf: '98765432100',
      phone: '+55 11 91234-5678',
      fullName: 'Maria Silva',
      addresses: {
        create: {
          street: 'Rua das Flores',
          number: '123',
          complement: 'Apto 45',
          district: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567',
          country: 'Brazil',
          isDefault: true,
        },
      },
    },
  });
  console.log('✅ Created client user:', client.email);

  const bag1 = await prisma.bag.upsert({
    where: { modelCode: 'ML 2026' },
    update: {},
    create: {
      modelCode: 'ML 2026',
      name: 'Longchamp Grande',
      description: 'Elegant large tote bag perfect for everyday use. Made with premium materials and featuring a spacious interior.',
      material: 'Canvas',
      size: 'LARGE',
      price: 450.00,
      stockQuantity: 50,
      isPromotion: false,
      colors: {
        create: [
          {
            colorName: 'Black',
            hexCode: '#000000',
            images: {
              create: [
                {
                  url: '/images/ml2026-black-front.jpg',
                  altText: 'Longchamp Grande Black - Front View',
                  displayOrder: 1,
                },
                {
                  url: '/images/ml2026-black-side.jpg',
                  altText: 'Longchamp Grande Black - Side View',
                  displayOrder: 2,
                },
              ],
            },
          },
          {
            colorName: 'Red',
            hexCode: '#DC143C',
            images: {
              create: [
                {
                  url: '/images/ml2026-red-front.jpg',
                  altText: 'Longchamp Grande Red - Front View',
                  displayOrder: 1,
                },
              ],
            },
          },
          {
            colorName: 'Navy Blue',
            hexCode: '#000080',
            images: {
              create: [
                {
                  url: '/images/ml2026-navy-front.jpg',
                  altText: 'Longchamp Grande Navy - Front View',
                  displayOrder: 1,
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('✅ Created bag:', bag1.name);

  const bag2 = await prisma.bag.upsert({
    where: { modelCode: 'ML 2027' },
    update: {},
    create: {
      modelCode: 'ML 2027',
      name: 'Elegance Mini',
      description: 'Compact and chic mini bag with premium varnish finish. Perfect for evening events.',
      material: 'Varnish',
      size: 'MINI',
      price: 280.00,
      promotionPrice: 220.00,
      stockQuantity: 30,
      isPromotion: true,
      colors: {
        create: [
          {
            colorName: 'Black',
            hexCode: '#000000',
            images: {
              create: [
                {
                  url: '/images/ml2027-black-front.jpg',
                  altText: 'Elegance Mini Black - Front View',
                  displayOrder: 1,
                },
              ],
            },
          },
          {
            colorName: 'Pink',
            hexCode: '#FFC0CB',
            images: {
              create: [
                {
                  url: '/images/ml2027-pink-front.jpg',
                  altText: 'Elegance Mini Pink - Front View',
                  displayOrder: 1,
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('✅ Created promotional bag:', bag2.name);

  const bag3 = await prisma.bag.upsert({
    where: { modelCode: 'ML 2028' },
    update: {},
    create: {
      modelCode: 'ML 2028',
      name: 'Summer Straw Tote',
      description: 'Natural straw bag perfect for summer days. Eco-friendly and stylish.',
      material: 'Straw',
      size: 'MEDIUM',
      price: 320.00,
      stockQuantity: 25,
      isPromotion: false,
      colors: {
        create: [
          {
            colorName: 'Natural',
            hexCode: '#D2B48C',
            images: {
              create: [
                {
                  url: '/images/ml2028-natural-front.jpg',
                  altText: 'Summer Straw Tote Natural - Front View',
                  displayOrder: 1,
                },
              ],
            },
          },
          {
            colorName: 'White',
            hexCode: '#FFFFFF',
            images: {
              create: [
                {
                  url: '/images/ml2028-white-front.jpg',
                  altText: 'Summer Straw Tote White - Front View',
                  displayOrder: 1,
                },
              ],
            },
          },
        ],
      },
    },
  });
  console.log('✅ Created bag:', bag3.name);

  const cart = await prisma.cart.upsert({
    where: { userId: client.id },
    update: {},
    create: {
      userId: client.id,
      items: {
        create: [
          {
            bagId: bag1.id,
            quantity: 1,
            selectedColor: 'Black',
          },
        ],
      },
    },
  });
  console.log('✅ Created cart for client');

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
