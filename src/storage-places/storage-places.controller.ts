import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StoragePlacesService } from './storage-places.service';
import { CreateStoragePlaceDto } from './dto/create-storage-place.dto';
import { UpdateStoragePlaceDto } from './dto/update-storage-place.dto';
import { StoragePlaceQueryDto } from './dto/storage-place-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('storage-places')
export class StoragePlacesController {
  constructor(private readonly service: StoragePlacesService) {}

  @Get()
  findAll(@Query() query: StoragePlaceQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateStoragePlaceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStoragePlaceDto) {
    return this.service.update(id, dto);
  }
}
