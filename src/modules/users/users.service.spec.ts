import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('argon2', () => ({
    hash: jest.fn().mockResolvedValue('hashed-password'),
}));

import * as argon2 from 'argon2';

describe('UsersService', () => {
    let service: UsersService;
    let prisma: {
        user: {
            findUnique: jest.Mock;
            update: jest.Mock;
            create: jest.Mock;
        };
    };

    const fullUser = {
        id: 'user-1',
        email: 'joao@email.com',
        password: 'stored-hash',
        role: UserRole.EMPLOYEE,
        cpf: null,
        phone: '11999999999',
        name: 'João',
        emailVerifiedAt: null,
        emailVerificationToken: 'secret-token',
        emailVerificationTokenExpiresAt: null,
        emailVerificationTokenSentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        prisma = {
            user: {
                findUnique: jest.fn(),
                update: jest.fn(),
                create: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        (argon2.hash as jest.Mock).mockClear();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('update', () => {
        it('lança NotFoundException quando o usuário não existe', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(
                service.update('missing', { name: 'Novo' }),
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it('re-aplica o hash argon2 quando a senha é enviada', async () => {
            prisma.user.findUnique.mockResolvedValue(fullUser);
            prisma.user.update.mockResolvedValue(fullUser);

            await service.update('user-1', { password: 'NovaSenha@123' });

            expect(argon2.hash).toHaveBeenCalledTimes(1);
            const call = prisma.user.update.mock.calls[0][0] as {
                data: { password?: string };
            };
            expect(call.data.password).toBe('hashed-password');
        });

        it('não faz hash quando a senha não é enviada', async () => {
            prisma.user.findUnique.mockResolvedValue(fullUser);
            prisma.user.update.mockResolvedValue(fullUser);

            await service.update('user-1', { name: 'Novo Nome' });

            expect(argon2.hash).not.toHaveBeenCalled();
        });

        it('não retorna campos sensíveis', async () => {
            prisma.user.findUnique.mockResolvedValue(fullUser);
            prisma.user.update.mockResolvedValue(fullUser);

            const result = await service.update('user-1', { name: 'X' });

            expect(result).not.toHaveProperty('password');
            expect(result).not.toHaveProperty('emailVerificationToken');
        });
    });

    describe('create', () => {
        it('não retorna a senha do usuário criado', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.create.mockResolvedValue(fullUser);

            const result = await service.create({
                email: 'novo@email.com',
                password: 'Senha@1234',
                phone: '11988887777',
                name: 'Novo',
                role: UserRole.EMPLOYEE,
            });

            expect(result).not.toHaveProperty('password');
            expect(argon2.hash).toHaveBeenCalledTimes(1);
        });
    });
});
