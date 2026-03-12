import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set in the environment variables.');
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      options: '-c timezone=America/Sao_Paulo',
    });

    super({
      adapter: new PrismaPg(pool),
    });

    this.pool = pool;
  }

  async onModuleInit() {
    await this.$connect();
    
    await this.$executeRaw`SHOW timezone`;
    await this.$executeRaw`SET timezone = 'America/Sao_Paulo'`;
    
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
  }
}
