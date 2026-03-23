import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
    UseInterceptors,
    UploadedFiles,
    BadRequestException,
    Put,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { OptionalJwtGuard } from '../auth/jwt/optional-jwt.guard';
import { User } from 'src/common/decorators/user.decorator';
import { UserResponse } from '../auth/types/user_response.type';
import { FilterProductsDto } from './dto/filter-products.dto';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Post()
    @UseInterceptors(AnyFilesInterceptor())
    create(
        @Body() createProductDto: CreateProductDto,
        @UploadedFiles() files: Express.Multer.File[],
    ) {
        if (!files || files.length === 0) {
            throw new BadRequestException('At least one image is required');
        }
        return this.productsService.create(createProductDto, files);
    }

    @UseGuards(OptionalJwtGuard)
    @Get()
    findAll(@Query() query: FilterProductsDto, @User() user?: UserResponse) {
        const isAdmin = user?.role === UserRole.ADMIN;
        return this.productsService.findAll(query, isAdmin);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Put(':id')
    @UseInterceptors(AnyFilesInterceptor())
    update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto, @UploadedFiles() files: Express.Multer.File[]) {
        
        return this.productsService.update(id, updateProductDto, files);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.productsService.remove(+id);
    }
}
