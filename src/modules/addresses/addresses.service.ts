import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AddressesService {
    constructor(private readonly prisma: PrismaService) {}

    async create(createAddressDto: CreateAddressDto, userId: string) {
        const address = await this.prisma.address.create({
            data: {
                ...createAddressDto,
                userId,
            },
        });
        return address;
    }

    async findByUserId(userId: string) {
        return await this.prisma.address.findMany({
            where: {
                userId,
            },
            select: {
                id: true,
                street: true,
                number: true,
                complement: true,
                district: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                isDefault: true,
                label: true,
            },
        });
    }

    async update(
        id: string,
        updateAddressDto: UpdateAddressDto,
        userId: string,
    ) {
        const address = await this.prisma.address.findUnique({
            where: { id, userId },
        });

        if (!address) {
            throw new NotFoundException('Endereço não encontrado');
        }

        return await this.prisma.address.update({
            where: { id, userId },
            data: updateAddressDto,
        });
    }

    async setDefaultAddress(id: string, userId: string) {
        const defaultAddress = await this.prisma.address.findFirst({
            where: { userId, isDefault: true },
        });

        const newDefaultAddress = await this.prisma.address.findUnique({
            where: { id, userId },
        });

        if (!newDefaultAddress)
            throw new NotFoundException('Endereço não encontrado');

        if (defaultAddress) {
            await this.prisma.address.update({
                where: { id: defaultAddress.id },
                data: { isDefault: false },
            });
        }

        return await this.prisma.address.update({
            where: { id, userId },
            data: { isDefault: true },
        });
    }
}
