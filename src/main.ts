import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const config = app.get(ConfigService);
    const clientUrl = config.get<string>('FRONTEND_URL');

    app.setGlobalPrefix('api');

    app.enableCors({
        origin: clientUrl,
        credentials: true,
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.use(cookieParser());

    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
