import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { User } from 'src/common/decorators/user.decorator';
import { UserResponse } from '../auth/types/user_response.type';
import { UseGuards } from '@nestjs/common';

@Controller('addresses')
export class AddressesController {
    constructor(private readonly addressesService: AddressesService) {}

    @UseGuards(JwtAuthGuard)
    @Post()
    create(
        @Body() createAddressDto: CreateAddressDto,
        @User() user: UserResponse,
    ) {
        return this.addressesService.create(createAddressDto, user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findByUserId(@User() user: UserResponse) {
        return this.addressesService.findByUserId(user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateAddressDto: UpdateAddressDto,
        @User() user: UserResponse,
    ) {
        return this.addressesService.update(id, updateAddressDto, user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/set-default')
    setDefaultAddress(@Param('id') id: string, @User() user: UserResponse) {
        return this.addressesService.setDefaultAddress(id, user.id);
    }
}
