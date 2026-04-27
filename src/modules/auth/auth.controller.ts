import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Req,
    Res,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { Request, Response } from 'express';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt/jwt.guard';
import { User } from 'src/common/decorators/user.decorator';
import { UserResponse } from './types/user_response.type';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyEmailTokenDto } from './dto/verify-email-token.dto';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly configService: ConfigService,
    ) {}

    @Post('login')
    async login(
        @Body() loginDto: LoginDto,
        @Res({ passthrough: true }) res: Response,
    ) {
        const { accessToken, refreshToken, user } =
            await this.authService.login(loginDto);

        const isProd =
            this.configService.get<string>('NODE_ENV') === 'production';
        const sameSite = isProd ? 'none' : 'lax';

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite,
            maxAge: 15 * 60 * 1000,
        });

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return { message: 'Login realizado com sucesso', user };
    }

    @Post('register')
    async register(@Body() createUserDto: CreateUserDto) {
        const user = await this.authService.register(createUserDto);
        return { message: 'Usuário cadastrado com sucesso', user };
    }

    @Post('refresh')
    async refresh(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = req.cookies.refresh_token;

        if (!refreshToken)
            throw new UnauthorizedException(
                'Token de atualização não encontrado',
            );

        const {
            accessToken,
            refreshToken: newRefreshToken,
            user,
        } = await this.authService.refreshToken(refreshToken);

        const isProd =
            this.configService.get<string>('NODE_ENV') === 'production';
        const sameSite = isProd ? 'none' : 'lax';

        res.cookie('access_token', accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite,
            maxAge: 15 * 60 * 1000,
        });

        res.cookie('refresh_token', newRefreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite,
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return { message: 'Token atualizado', user };
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    async logout(
        @User() user: UserResponse,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const refreshToken = req.cookies.refresh_token;

        if (!refreshToken)
            throw new UnauthorizedException(
                'Token de atualização não encontrado',
            );

        await this.authService.logout(user.id);

        res.clearCookie('access_token');
        res.clearCookie('refresh_token');

        return { message: 'Logout realizado com sucesso' };
    }

    @UseGuards(JwtAuthGuard)
    @Post('verify-email')
    async verifyEmail(@User() user: UserResponse) {
        return this.authService.verifyEmail(user.id);
    }

    @Get('verify-email-token')
    async verifyEmailToken(@Query() query: VerifyEmailTokenDto) {
        return this.authService.verifyEmailToken(query);
    }

    @UseGuards(JwtAuthGuard)
    @Post('resend-email-verification')
    async resendEmailVerification(@User() user: UserResponse) {
        return this.authService.resendEmailVerification(user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async me(@User() user: UserResponse) {
        return { message: 'Usuário obtido com sucesso', user };
    }
}
