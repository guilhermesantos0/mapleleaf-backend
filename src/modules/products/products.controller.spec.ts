import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { OptionalJwtGuard } from '../auth/jwt/optional-jwt.guard';

describe('ProductsController', () => {
    let controller: ProductsController;
    let service: {
        create: jest.Mock;
        findAll: jest.Mock;
        findOne: jest.Mock;
        update: jest.Mock;
        remove: jest.Mock;
    };

    beforeEach(async () => {
        service = {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProductsController],
            providers: [{ provide: ProductsService, useValue: service }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(OptionalJwtGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<ProductsController>(ProductsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('lança BadRequestException quando nenhum arquivo é enviado', () => {
            expect(() =>
                controller.create({} as any, []),
            ).toThrow(BadRequestException);
            expect(service.create).not.toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('repassa o id ao service (guard ADMIN é responsabilidade do RolesGuard mockado)', () => {
            controller.remove('product-1');

            expect(service.remove).toHaveBeenCalledWith('product-1');
        });
    });
});
