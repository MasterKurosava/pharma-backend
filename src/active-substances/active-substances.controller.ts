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
import { ActiveSubstancesService } from './active-substances.service';
import { CreateActiveSubstanceDto } from './dto/create-active-substance.dto';
import { UpdateActiveSubstanceDto } from './dto/update-active-substance.dto';
import { ActiveSubstanceQueryDto } from './dto/active-substance-query.dto';

@UseGuards(JwtAuthGuard)
@UseInterceptors(CacheInterceptor)
@Controller('active-substances')
export class ActiveSubstancesController {
  constructor(private readonly service: ActiveSubstancesService) {}

  @Get()
  @CacheTTL(900)
  findAll(@Query() query: ActiveSubstanceQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateActiveSubstanceDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateActiveSubstanceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard)
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
