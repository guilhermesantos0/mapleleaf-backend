import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

describe('UsersController', () => {
    let controller: UsersController;
    let service: {
        findAllEmployees: jest.Mock;
        findOne: jest.Mock;
        update: jest.Mock;
        create: jest.Mock;
    };

    beforeEach(async () => {
        service = {
            findAllEmployees: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            create: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [{ provide: UsersService, useValue: service }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<UsersController>(UsersController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('update', () => {
        it('repassa o DTO ao service', async () => {
            service.update.mockResolvedValue({ id: 'user-1' });

            await controller.update('user-1', { name: 'Novo Nome' });

            expect(service.update).toHaveBeenCalledWith('user-1', {
                name: 'Novo Nome',
            });
        });
    });

    describe('create', () => {
        it('repassa o DTO ao service', async () => {
            service.create.mockResolvedValue({ id: 'user-2' });

            const dto = {
                email: 'novo@email.com',
                password: 'Senha@1234',
                phone: '11988887777',
                name: 'Novo',
                role: UserRole.EMPLOYEE,
            };

            await controller.create(dto);

            expect(service.create).toHaveBeenCalledWith(dto);
        });
    });
});
