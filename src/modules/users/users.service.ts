import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from '../auth/dto/create-user.dto';
import * as argon2 from 'argon2';
import { UserRole } from '@prisma/client';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async findAllEmployees() {
        const allUsers = await this.prisma.user.findMany({
            where: {
                role: { not: UserRole.CLIENT }
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true
            },
            orderBy: {
                createdAt: 'desc'
            }
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
                phone: true
            }
        });

        if (!user) throw new NotFoundException('User not found');

        return user;
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        const user = await this.prisma.user.findUnique({
            where: { id }
        });

        if (!user) throw new NotFoundException('User not found');

        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: {
                ...updateUserDto
            }
        });

        return updatedUser;
    }

    async create(createUserDto: CreateUserDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email }
        })

        if (existingUser) throw new ConflictException('User already exists');

        const hashedPassword = await argon2.hash(createUserDto.password + process.env.PASSWORD_PEPPER);

        const user = await this.prisma.user.create({
            data: {
                email: createUserDto.email,
                password: hashedPassword,
                role: createUserDto.role || UserRole.CLIENT,
                name: createUserDto.name,
                phone: createUserDto.phone
            }
        })

        return user;
    }

    async createAddress(createAddressDto: CreateAddressDto, userId: string) {
        const address = await this.prisma.address.create({
            data: {
                ...createAddressDto,
                userId
            }
        })
        return address;
    }
}
