# Prisma Database Setup Guide

This guide will help you set up and initialize the database for the Maple Leaf e-commerce platform.

## Prerequisites

- PostgreSQL database running (via Docker or local installation)
- Database connection string configured in `.env` file

## Quick Start

### 1. Generate Prisma Client

Generate the Prisma Client based on your schema:

```bash
npm run prisma:generate
```

### 2. Create and Apply Database Migration

Create the initial migration and apply it to your database:

```bash
npm run prisma:migrate
```

When prompted, name your migration (e.g., "init" or "initial_schema").

### 3. Seed the Database (Optional)

Populate the database with sample data for development:

```bash
npm run prisma:seed
```

This will create:
- 1 Admin user (`admin@mapleleaf.com`)
- 1 Employee user (`employee@mapleleaf.com`)
- 1 Client user (`client@example.com`) with an address
- 3 Sample bags with colors and images
- A sample cart for the client

**Note**: All sample users have the password: `$2b$10$dummyHashedPasswordForDemo` (you should implement proper password hashing in your application)

### 4. Open Prisma Studio (Optional)

View and edit your database data with a GUI:

```bash
npm run prisma:studio
```

This will open a browser window with Prisma Studio at `http://localhost:5555`

## Database Schema Overview

The schema includes the following models:

### Users & Authentication
- **User**: Core user model with role-based access (ADMIN, EMPLOYEE, CLIENT)
- **Address**: Shipping addresses for clients

### Products
- **Bag**: Handbag products with model codes, materials, sizes, pricing
- **BagColor**: Color variants for each bag
- **Image**: Product images for each color variant

### E-commerce
- **Cart** & **CartItem**: Shopping cart functionality
- **Order** & **OrderItem**: Order management with status tracking

## Available NPM Scripts

```bash
# Generate Prisma Client (run after schema changes)
npm run prisma:generate

# Create a new migration (development)
npm run prisma:migrate

# Apply migrations (production)
npm run prisma:migrate:deploy

# Open Prisma Studio GUI
npm run prisma:studio

# Seed the database with sample data
npm run prisma:seed
```

## Common Tasks

### Making Schema Changes

1. Edit `prisma/schema.prisma`
2. Run `npm run prisma:generate` to update the client
3. Run `npm run prisma:migrate` to create and apply migration

### Resetting the Database

⚠️ **Warning**: This will delete all data!

```bash
npx prisma migrate reset
```

This will:
1. Drop the database
2. Create a new database
3. Apply all migrations
4. Run seed script (if configured)

### Viewing Database in GUI

```bash
npm run prisma:studio
```

### Production Deployment

1. Set `DATABASE_URL` in production environment
2. Run migrations:
   ```bash
   npm run prisma:migrate:deploy
   ```

## Integration with NestJS

To use Prisma in your NestJS application, create a Prisma service:

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

Then inject it into your services:

```typescript
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }
}
```

## Troubleshooting

### Connection Issues

If you can't connect to the database:
1. Check that PostgreSQL is running
2. Verify `DATABASE_URL` in `.env` file
3. Ensure the database exists

### Migration Issues

If migrations fail:
1. Check database permissions
2. Review migration SQL in `prisma/migrations/`
3. Consider using `npx prisma migrate reset` for development

### Generate Issues

If `prisma generate` fails:
1. Check for syntax errors in `schema.prisma`
2. Delete `node_modules/.prisma` and try again
3. Run `npm install @prisma/client`

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [NestJS + Prisma Guide](https://docs.nestjs.com/recipes/prisma)
- Schema documentation: `prisma/README.md`
