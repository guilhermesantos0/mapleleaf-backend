import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { LoginDto } from './dto/login.dto';
import { randomBytes } from 'crypto';
import { User, UserRole } from '@prisma/client';
import { UserResponse } from './types/user_response.type';
import { CreateUserDto } from './dto/create-user.dto';

type SafeUser = {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    cpf: string;
    phone: string;
    createdAt: Date;
    updatedAt: Date;
}

type LoginResponse = {
    accessToken: string;
    refreshToken: string;
    user: UserResponse;
}

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) {}

    private async toSafeUserObject(user: User): Promise<SafeUser> {
        return {
            id: user.id,
            email: user.email,
            name: user.name || 'Unknown',
            role: user.role,
            cpf: user.cpf || 'Unknown',
            phone: user.phone || 'Unknown',
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        }
    }

    private async toResponseUserObject(user: User): Promise<UserResponse> {
        return {
            id: user.id,
            email: user.email,
            name: user.name || 'Unknown',
            role: user.role,
        }
    }

    private async validateUser(email: string, password: string): Promise<any> {
        const user = await this.prisma.user.findUnique({
            where: { email },
        })

        if (!user) throw new UnauthorizedException('Invalid credentials');

        const isPasswordValid = await argon2.verify(user.password, password + process.env.PASSWORD_PEPPER);
        if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

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
                expiresAt
            }
        })

        return token;
    }

    async login(loginDto: LoginDto): Promise<LoginResponse> {
        const user = await this.validateUser(loginDto.email, loginDto.password);

        const payload = { sub: user.id, email: user.email };
        const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
        const refreshToken = await this.generateRefreshToken(user.id);

        return { accessToken, refreshToken, user };
    }

    async register(createUserDto: CreateUserDto): Promise<SafeUser> {
        const existingUser = await this.prisma.user.findUnique({ where: { email: createUserDto.email } });

        if (existingUser) throw new ConflictException('User already exists');

        const hashedPassword = await argon2.hash(createUserDto.password + process.env.PASSWORD_PEPPER);

        const user = await this.prisma.user.create({
            data: {
                email: createUserDto.email,
                password: hashedPassword,
                role: UserRole.CLIENT,
                name: createUserDto.name,
            },
        });
        
        return await this.toSafeUserObject(user);
    }

    async refreshToken(refreshToken: string, userId: string): Promise<LoginResponse> {

        const token = await this.prisma.refreshToken.findFirst({
            where: { userId },
            include: { user: true },
        });

        if (!token) throw new UnauthorizedException('Invalid refresh token');

        const isTokenValid = await argon2.verify(token.token, refreshToken);
        if (!isTokenValid) throw new UnauthorizedException('Invalid refresh token');

        if (token.expiresAt < new Date()) throw new UnauthorizedException('Refresh token expired');

        const user = await this.toResponseUserObject(token.user);

        await this.prisma.refreshToken.delete({
            where: { id: token.id },
        });

        const payload = { sub: user.id, email: user.email };
        const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });
        const newRefreshToken = await this.generateRefreshToken(user.id);

        return { accessToken, refreshToken: newRefreshToken, user };
    }

    async logout(userId: string): Promise<void> {
        await this.prisma.refreshToken.deleteMany({
            where: { userId },
        });
    }
}
