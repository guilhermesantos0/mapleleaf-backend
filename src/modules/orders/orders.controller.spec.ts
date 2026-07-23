import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@prisma/client';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

describe('OrdersController', () => {
    let controller: OrdersController;
    let service: {
        getOrders: jest.Mock;
        updateOrder: jest.Mock;
    };

    beforeEach(async () => {
        service = {
            getOrders: jest.fn(),
            updateOrder: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrdersController],
            providers: [{ provide: OrdersService, useValue: service }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(RolesGuard)
            .useValue({ canActivate: () => true })
            .compile();

        controller = module.get<OrdersController>(OrdersController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('repassa o DTO tipado de atualização ao service', async () => {
        service.updateOrder.mockResolvedValue({ id: 'order-1' });

        await controller.updateOrder('order-1', {
            status: OrderStatus.CONFIRMED,
        });

        expect(service.updateOrder).toHaveBeenCalledWith('order-1', {
            status: OrderStatus.CONFIRMED,
        });
    });
});
