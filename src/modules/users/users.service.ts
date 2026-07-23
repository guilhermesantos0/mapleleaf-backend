import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from '../auth/dto/create-user.dto';
import * as argon2 from 'argon2';
import { Prisma, User, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async findAllEmployees() {
        const allUsers = await this.prisma.user.findMany({
            where: {
                role: { not: UserRole.CLIENT },
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return allUsers;
    }

    async findOne(id: string) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
            },
        });

        if (!user) throw new NotFoundException('Usuário não encontrado');

        return user;
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        const user = await this.prisma.user.findUnique({
            where: { id },
        });

        if (!user) throw new NotFoundException('Usuário não encontrado');

        const { password, ...rest } = updateUserDto;

        const data: Prisma.UserUpdateInput = { ...rest };

        // Re-aplica o hash argon2 quando a senha é alterada por este endpoint,
        // para manter o mesmo formato do fluxo de criação/registro.
        if (password) {
            data.password = await argon2.hash(
                password + process.env.PASSWORD_PEPPER,
            );
        }

        const updatedUser = await this.prisma.user.update({
            where: { id },
            data,
        });

        return this.toSafeUser(updatedUser);
    }

    async create(createUserDto: CreateUserDto) {
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
                role: createUserDto.role || UserRole.CLIENT,
                name: createUserDto.name,
                phone: createUserDto.phone,
            },
        });

        return this.toSafeUser(user);
    }

    // Monta o objeto de usuário sem campos sensíveis (senha e tokens de
    // verificação) antes de retornar pela API administrativa.
    private toSafeUser(user: User) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            cpf: user.cpf,
            emailVerifiedAt: user.emailVerifiedAt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
}
