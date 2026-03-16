import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CartsService } from './carts.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { User } from 'src/common/decorators/user.decorator';
import { UserResponse } from '../auth/types/user_response.type';
import { DeleteItemDto } from './dto/delete-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Controller('carts')
export class CartsController {
    constructor(private readonly cartsService: CartsService) {}

    @UseGuards(JwtAuthGuard)
    @Get()
    findUserCart(@User() user: UserResponse) {
        return this.cartsService.findByUserId(user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('items')
    create(@Body() createCartDto: CreateCartDto, @User() user: UserResponse) {
        return this.cartsService.addToCart(createCartDto, user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('items/:id')
    updateItemQuantity(@Param('id') id: string, @Body() updateItemQuantityDto: UpdateItemDto, @User() user: UserResponse) {
        return this.cartsService.updateItemQuantity(id, user.id, updateItemQuantityDto.quantity);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('items')
    clearUserCart(@User() user: UserResponse) {
        return this.cartsService.clearUserCart(user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Delete('items/:id')
    removeItem(@Param('id') id: string, @User() user: UserResponse, @Body() deleteItemDto: DeleteItemDto) {
        return this.cartsService.removeItem(id, user.id, deleteItemDto.quantity);
    }
}
