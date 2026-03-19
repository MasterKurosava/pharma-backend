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
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProductOrderSourcesService } from './product-order-sources.service';
import { CreateProductOrderSourceDto } from './dto/create-product-order-source.dto';
import { UpdateProductOrderSourceDto } from './dto/update-product-order-source.dto';
import { ProductOrderSourceQueryDto } from './dto/product-order-source-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('product-order-sources')
export class ProductOrderSourcesController {
  constructor(private readonly service: ProductOrderSourcesService) {}

  @Get()
  findAll(@Query() query: ProductOrderSourceQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateProductOrderSourceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductOrderSourceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
