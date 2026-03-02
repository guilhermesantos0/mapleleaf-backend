# Database Schema Documentation

This document describes the database schema for the Maple Leaf e-commerce platform.

## Overview

The schema is designed to support a bag/handbag e-commerce platform with three user roles: Admin, Employee, and Client.

## User Roles & Permissions

### 1. Admin
- **Fields**: email, password
- **Permissions**:
  - Add, edit, and delete products
  - Add, edit, and delete users

### 2. Employee
- **Fields**: email, password, cpf, phone
- **Permissions**:
  - Access orders
  - Mark orders as completed
  - View customer and order data

### 3. Client
- **Fields**: email, password, cpf, phone, fullName
- **Permissions**:
  - Create account
  - Add products to cart
  - Make purchases
  - View and edit profile data
  - Manage multiple addresses

## Data Models

### User
Core user model with role-based access control.
- All users have: email, password, role
- Employees and Clients have: cpf, phone
- Clients additionally have: fullName, addresses

### Address
Stores shipping addresses for clients.
- Each client can have multiple addresses
- One address can be marked as default

### Bag (Product)
Represents handbag products.
- **modelCode**: Unique identifier (e.g., "ML 2026")
- **name**: Product name (e.g., "Longchamp Grande")
- **material**: Type of material (e.g., "canvas", "varnish", "straw")
- **size**: Enum (MINI, SMALL, MEDIUM, LARGE)
- **description**: Detailed product description
- **isPromotion**: Boolean flag for promotional items
- **price**: Regular price
- **promotionPrice**: Discounted price (optional)
- **stockQuantity**: Available inventory

### BagColor
Color variants for each bag model.
- Each bag can have multiple colors
- Includes colorName and optional hexCode

### Image
Product images for each color variant.
- Multiple images per color
- Includes displayOrder for sorting
- Stores URL and alt text for accessibility

### Cart & CartItem
Shopping cart functionality.
- Each user can have one cart
- Cart items track: bag, quantity, selected color

### Order & OrderItem
Complete order management.
- **orderNumber**: Unique order identifier
- **status**: PENDING, PROCESSING, COMPLETED, CANCELLED
- **completedBy**: Tracks which employee completed the order
- Stores pricing snapshot at time of order
- Links to delivery address

## Relationships

```
User (1) -----> (N) Address
User (1) -----> (1) Cart
User (1) -----> (N) Order
Cart (1) -----> (N) CartItem
Order (1) ----> (N) OrderItem
Bag (1) ------> (N) BagColor
BagColor (1) -> (N) Image
Bag (1) ------> (N) CartItem
Bag (1) ------> (N) OrderItem
Address (1) --> (N) Order
```

## Setup Instructions

1. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

2. **Create Migration**:
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Apply Migration to Production**:
   ```bash
   npx prisma migrate deploy
   ```

4. **Open Prisma Studio** (Database GUI):
   ```bash
   npx prisma studio
   ```

## Example Usage

### Creating a User
```typescript
const client = await prisma.user.create({
  data: {
    email: 'customer@example.com',
    password: 'hashedPassword',
    role: 'CLIENT',
    cpf: '12345678900',
    phone: '+55 11 98765-4321',
    fullName: 'João Silva',
    addresses: {
      create: {
        street: 'Rua das Flores',
        number: '123',
        district: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
        country: 'Brazil',
        isDefault: true
      }
    }
  }
});
```

### Creating a Bag with Colors
```typescript
const bag = await prisma.bag.create({
  data: {
    modelCode: 'ML 2026',
    name: 'Longchamp Grande',
    description: 'Elegant large tote bag',
    material: 'canvas',
    size: 'LARGE',
    price: 450.00,
    stockQuantity: 50,
    colors: {
      create: [
        {
          colorName: 'Black',
          hexCode: '#000000',
          images: {
            create: [
              { url: '/images/ml2026-black-1.jpg', displayOrder: 1 },
              { url: '/images/ml2026-black-2.jpg', displayOrder: 2 }
            ]
          }
        },
        {
          colorName: 'Red',
          hexCode: '#FF0000',
          images: {
            create: [
              { url: '/images/ml2026-red-1.jpg', displayOrder: 1 }
            ]
          }
        }
      ]
    }
  }
});
```

### Creating an Order
```typescript
const order = await prisma.order.create({
  data: {
    userId: 'user-id',
    addressId: 'address-id',
    orderNumber: 'ORD-2026-0001',
    status: 'PENDING',
    subtotal: 450.00,
    shippingCost: 25.00,
    totalAmount: 475.00,
    items: {
      create: [
        {
          bagId: 'bag-id',
          quantity: 1,
          selectedColor: 'Black',
          unitPrice: 450.00,
          subtotal: 450.00
        }
      ]
    }
  }
});
```

## Notes

- All IDs use UUID format for security and scalability
- Timestamps (createdAt, updatedAt) are automatically managed
- Cascade deletes are configured for related data
- CPF fields are unique when provided (for employees and clients)
- Order items store price snapshot to maintain historical accuracy
