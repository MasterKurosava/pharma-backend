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
import { StoragePlacesService } from './storage-places.service';
import { CreateStoragePlaceDto } from './dto/create-storage-place.dto';
import { UpdateStoragePlaceDto } from './dto/update-storage-place.dto';
import { StoragePlaceQueryDto } from './dto/storage-place-query.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(CacheInterceptor)
@Controller('storage-places')
export class StoragePlacesController {
  constructor(private readonly service: StoragePlacesService) {}

  @Get()
  @CacheTTL(900)
  findAll(@Query() query: StoragePlaceQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('admin', 'manager', 'assembler')
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateStoragePlaceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager', 'assembler')
  @UseGuards(RolesGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStoragePlaceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'manager', 'assembler')
  @UseGuards(RolesGuard)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
