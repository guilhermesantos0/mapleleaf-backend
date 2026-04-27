import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { LoginDto } from './dto/login.dto';
import { randomBytes } from 'crypto';
import { User, UserRole } from '@prisma/client';
import { UserResponse } from './types/user_response.type';
import { CreateUserDto } from './dto/create-user.dto';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from 'src/modules/mail/mail.service';
import { VerifyEmailTokenDto } from './dto/verify-email-token.dto';

type SafeUser = {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    cpf: string;
    phone: string;
    createdAt: Date;
    updatedAt: Date;
};

type LoginResponse = {
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
};

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly mailService: MailService,
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    ) {}

    private async toSafeUserObject(user: User): Promise<SafeUser> {
        return {
            id: user.id,
            email: user.email,
            name: user.name || 'Desconhecido',
            role: user.role,
            cpf: user.cpf || 'Desconhecido',
            phone: user.phone || 'Desconhecido',
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }

    private async toResponseUserObject(user: User): Promise<UserResponse> {
        return {
            id: user.id,
            email: user.email,
            name: user.name || 'Desconhecido',
            role: user.role,
            emailVerifiedAt: user.emailVerifiedAt || null,
        };
    }

    private async validateUser(email: string, password: string): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });

        if (!user) throw new UnauthorizedException('Credenciais inválidas');

        const isPasswordValid = await argon2.verify(
            user.password,
            password + process.env.PASSWORD_PEPPER,
        );
        if (!isPasswordValid)
            throw new UnauthorizedException('Credenciais inválidas');

        return await this.toResponseUserObject(user);
    }

    private async generateRefreshToken(userId: string): Promise<string> {
        const token = randomBytes(64).toString('hex');

        const hashedToken = await argon2.hash(token);

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await this.prisma.refreshToken.create({
            data: {
                token: hashedToken,
                userId,
                expiresAt,
            },
        });

        return `${userId}.${token}`;
    }

    private async generateEmailVerificationToken(
        userId: string,
    ): Promise<{ token: string; expiresAt: Date; sentAt: Date }> {
        const token = randomBytes(64).toString('hex');
        const hashedToken = await argon2.hash(token);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        const sentAt = new Date();

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                emailVerificationToken: hashedToken,
                emailVerificationTokenExpiresAt: expiresAt,
                emailVerificationTokenSentAt: sentAt,
            },
        });

        return { token, expiresAt, sentAt };
    }

    private verificationEmailHtml(params: {
        name?: string | null;
        verificationUrl: string;
        appName: string;
    }): string {
        const { name, verificationUrl, appName } = params;
        const safeName = name?.trim() ? name.trim() : 'Olá';
        return `
<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.5">
  <h2>Confirme seu e-mail</h2>
  <p>${safeName},</p>
  <p>Para confirmar seu e-mail no <strong>${appName}</strong>, clique no link abaixo:</p>
  <p><a href="${verificationUrl}" target="_blank" rel="noreferrer">${verificationUrl}</a></p>
  <p>Esse link expira em 15 minutos.</p>
</div>
`.trim();
    }

    private async sendVerificationEmail(params: {
        email: string;
        name?: string | null;
        token: string;
    }): Promise<void> {
        const backendUrl = this.configService.get<string>('BACKEND_URL');
        const appName = this.configService.get<string>('APP_NAME', 'MapleLeaf');

        if (!backendUrl) return;

        const verificationUrl = `${backendUrl}/auth/verify-email-token?email=${encodeURIComponent(
            params.email,
        )}&token=${encodeURIComponent(params.token)}`;

        await this.mailService.sendEmail({
            to: params.email,
            subject: 'Confirme seu e-mail',
            html: this.verificationEmailHtml({
                name: params.name,
                verificationUrl,
                appName,
            }),
            text: `Confirme seu e-mail acessando: ${verificationUrl}`,
        });
    }

    async login(loginDto: LoginDto): Promise<LoginResponse> {
        const user = await this.validateUser(loginDto.email, loginDto.password);

        if (!user) throw new UnauthorizedException('Credenciais inválidas');

        if (!user.emailVerifiedAt)
            throw new UnauthorizedException('E-mail não verificado');

        const oldRefreshToken = await this.prisma.refreshToken.findFirst({
            where: { userId: user.id },
        });

        if (oldRefreshToken)
            await this.prisma.refreshToken.delete({
                where: { id: oldRefreshToken.id },
            });

        const payload = { sub: user.id, email: user.email };
        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: '15m',
        });
        const refreshToken = await this.generateRefreshToken(user.id);

        return { accessToken, refreshToken, user };
    }

    async register(createUserDto: CreateUserDto): Promise<SafeUser> {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });

        if (existingUser) throw new ConflictException('Usuário já existe');

        const hashedPassword = await argon2.hash(
            createUserDto.password + process.env.PASSWORD_PEPPER,
        );

        const user = await this.prisma.user.create({
            data: {
                email: createUserDto.email,
                password: hashedPassword,
                role: UserRole.CLIENT,
                name: createUserDto.name,
            },
        });

        const { token } = await this.generateEmailVerificationToken(user.id);
        await this.sendVerificationEmail({
            email: user.email,
            name: user.name,
            token,
        });

        return await this.toSafeUserObject(user);
    }

    async verifyEmailToken(dto: VerifyEmailTokenDto): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (!user) throw new UnauthorizedException('Usuário não encontrado');
        if (user.emailVerifiedAt)
            throw new ConflictException('E-mail já verificado');

        if (!user.emailVerificationToken || !user.emailVerificationTokenExpiresAt)
            throw new UnauthorizedException('Token de verificação inválido');

        if (user.emailVerificationTokenExpiresAt < new Date())
            throw new UnauthorizedException('Token de verificação expirado');

        const isTokenValid = await argon2.verify(
            user.emailVerificationToken,
            dto.token,
        );

        if (!isTokenValid)
            throw new UnauthorizedException('Token de verificação inválido');

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifiedAt: new Date(),
                emailVerificationToken: null,
                emailVerificationTokenExpiresAt: null,
                emailVerificationTokenSentAt: null,
            },
        });

        return { message: 'E-mail verificado com sucesso' };
    }

    async refreshToken(compositeToken: string): Promise<LoginResponse> {
        const separatorIndex = compositeToken.indexOf('.');
        if (separatorIndex === -1)
            throw new UnauthorizedException('Token de atualização inválido');

        const userId = compositeToken.substring(0, separatorIndex);
        const rawToken = compositeToken.substring(separatorIndex + 1);

        const token = await this.prisma.refreshToken.findFirst({
            where: { userId },
            include: { user: true },
        });

        if (!token)
            throw new UnauthorizedException('Token de atualização inválido');

        const isTokenValid = await argon2.verify(token.token, rawToken);
        if (!isTokenValid)
            throw new UnauthorizedException('Token de atualização inválido');

        if (token.expiresAt < new Date())
            throw new UnauthorizedException('Token de atualização expirado');

        const user = await this.toResponseUserObject(token.user);

        await this.prisma.refreshToken.delete({
            where: { id: token.id },
        });

        const payload = { sub: user.id, email: user.email };
        const accessToken = await this.jwtService.signAsync(payload, {
            expiresIn: '15m',
        });
        const newRefreshToken = await this.generateRefreshToken(user.id);

        return { accessToken, refreshToken: newRefreshToken, user };
    }

    async logout(userId: string): Promise<void> {
        await this.prisma.refreshToken.deleteMany({
            where: { userId },
        });
    }

    async verifyEmail(userId: string): Promise<void> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) throw new UnauthorizedException('Usuário não encontrado');

        if (user.emailVerifiedAt)
            throw new ConflictException('E-mail já verificado');

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                emailVerifiedAt: new Date(),
                emailVerificationToken: null,
                emailVerificationTokenExpiresAt: null,
                emailVerificationTokenSentAt: null,
            },
        });
    }

    async resendEmailVerification(userId: string): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) throw new UnauthorizedException('Usuário não encontrado');

        if (user.emailVerifiedAt)
            throw new ConflictException('E-mail já verificado');

        if (
            user.emailVerificationTokenExpiresAt &&
            user.emailVerificationTokenExpiresAt < new Date()
        ) {
            const { token } = await this.generateEmailVerificationToken(userId);
            await this.sendVerificationEmail({
                email: user.email,
                name: user.name,
                token,
            });
            return { message: 'Token de verificação de e-mail reenviado' };
        } else {
            return { message: 'Token de verificação de e-mail já foi enviado' };
        }
    }

    private usersCacheKey(userId: string): string {
        return `user:${userId}`;
    }

    private async fetchUser(userId: string): Promise<UserResponse> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) throw new UnauthorizedException('Usuário não encontrado');

        return await this.toResponseUserObject(user);
    }

    async me(userId: string): Promise<UserResponse> {
        const ttl = this.configService.get<number>('CACHE_TTL_MS', 60_000);
        const cacheKey = this.usersCacheKey(userId);

        return this.cacheManager.wrap(
            cacheKey,
            () => this.fetchUser(userId),
            ttl,
        );
    }
}
