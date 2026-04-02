import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ProductOrderSourcesService } from './product-order-sources.service';
import { CreateProductOrderSourceDto } from './dto/create-product-order-source.dto';
import { UpdateProductOrderSourceDto } from './dto/update-product-order-source.dto';
import { ProductOrderSourceQueryDto } from './dto/product-order-source-query.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(CacheInterceptor)
@Controller('product-order-sources')
export class ProductOrderSourcesController {
  constructor(private readonly service: ProductOrderSourcesService) {}

  @Get()
  @CacheTTL(900)
  findAll(@Query() query: ProductOrderSourceQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateProductOrderSourceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductOrderSourceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
