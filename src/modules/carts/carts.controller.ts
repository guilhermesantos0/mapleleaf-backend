import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CartsService } from './carts.service';
import { CreateCartDto } from './dto/create-cart.dto';
import { UpdateCartDto } from './dto/update-cart.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { User } from 'src/common/decorators/user.decorator';
import { UserResponse } from '../auth/types/user_response.type';

@Controller('carts')
export class CartsController {
    constructor(private readonly cartsService: CartsService) {}

    @UseGuards(JwtAuthGuard)
    @Post()
    create(@Body() createCartDto: CreateCartDto, @User() user: UserResponse) {
        return this.cartsService.addToCart(createCartDto, user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    findAll(@User() user: UserResponse) {
        return this.cartsService.findByUserId(user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.cartsService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateCartDto: UpdateCartDto) {
        return this.cartsService.update(+id, updateCartDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.cartsService.remove(+id);
    }
}
