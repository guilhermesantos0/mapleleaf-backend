import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

/**
 * Cache global com Redis (Keyv + @keyv/redis).
 * Variáveis: REDIS_URL (ex.: redis://localhost:6379), CACHE_TTL_MS (TTL padrão em ms).
 */
@Module({
    imports: [
        CacheModule.registerAsync({
            isGlobal: true,
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => {
                const redisUrl = configService.get<string>('REDIS_URL', 'redis://127.0.0.1:6379');
                const ttl = configService.get<number>('CACHE_TTL_MS', 60_000);

                return {
                    stores: createKeyv(redisUrl),
                    ttl,
                };
            },
            inject: [ConfigService],
        }),
    ],
    exports: [CacheModule],
})
export class RedisCacheModule {}
