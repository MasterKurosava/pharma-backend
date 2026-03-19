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
import { ClientStatusesService } from './client-statuses.service';
import { CreateClientStatusDto } from './dto/create-client-status.dto';
import { UpdateClientStatusDto } from './dto/update-client-status.dto';
import { ClientStatusQueryDto } from './dto/client-status-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('client-statuses')
export class ClientStatusesController {
  constructor(private readonly service: ClientStatusesService) {}

  @Get()
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
}
