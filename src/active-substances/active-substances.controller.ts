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
import { ActiveSubstancesService } from './active-substances.service';
import { CreateActiveSubstanceDto } from './dto/create-active-substance.dto';
import { UpdateActiveSubstanceDto } from './dto/update-active-substance.dto';
import { ActiveSubstanceQueryDto } from './dto/active-substance-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('active-substances')
export class ActiveSubstancesController {
  constructor(private readonly service: ActiveSubstancesService) {}

  @Get()
  findAll(@Query() query: ActiveSubstanceQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateActiveSubstanceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateActiveSubstanceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
