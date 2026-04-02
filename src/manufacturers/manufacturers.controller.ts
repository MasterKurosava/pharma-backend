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
import { ManufacturersService } from './manufacturers.service';
import { CreateManufacturerDto } from './dto/create-manufacturer.dto';
import { UpdateManufacturerDto } from './dto/update-manufacturer.dto';
import { ManufacturerQueryDto } from './dto/manufacturer-query.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(CacheInterceptor)
@Controller('manufacturers')
export class ManufacturersController {
  constructor(private readonly service: ManufacturersService) {}

  @Get()
  @CacheTTL(900)
  findAll(@Query() query: ManufacturerQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateManufacturerDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateManufacturerDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
