import { Controller, Delete, Get, Param, Patch, Query, UseGuards, Body, Post } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Get()
    async getOrders(@Query() query: any) {
        return this.ordersService.getOrders(query);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Get(':id')
    async getOrderById(@Param('id') id: string) {
        return this.ordersService.getOrderById(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Patch(':id')
    async updateOrder(@Param('id') id: string, @Body() body: any) {
        return this.ordersService.updateOrder(id, body);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post(':id/cancel')
    async cancelOrder(@Param('id') id: string) {
        return this.ordersService.cancelOrder(id);
    }
}
