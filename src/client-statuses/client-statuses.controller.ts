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
import { ClientStatusesService } from './client-statuses.service';
import { CreateClientStatusDto } from './dto/create-client-status.dto';
import { UpdateClientStatusDto } from './dto/update-client-status.dto';
import { ClientStatusQueryDto } from './dto/client-status-query.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(CacheInterceptor)
@Controller('client-statuses')
export class ClientStatusesController {
  constructor(private readonly service: ClientStatusesService) {}

  @Get()
  @CacheTTL(900)
  findAll(@Query() query: ClientStatusQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateClientStatusDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateClientStatusDto) {
    return this.service.update(id, dto);
  }

    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number) {
      return this.service.delete(id);
    }
}
