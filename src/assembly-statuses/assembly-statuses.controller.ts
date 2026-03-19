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
import { AssemblyStatusesService } from './assembly-statuses.service';
import { CreateAssemblyStatusDto } from './dto/create-assembly-status.dto';
import { UpdateAssemblyStatusDto } from './dto/update-assembly-status.dto';
import { AssemblyStatusQueryDto } from './dto/assembly-status-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('assembly-statuses')
export class AssemblyStatusesController {
  constructor(private readonly service: AssemblyStatusesService) {}

  @Get()
  findAll(@Query() query: AssemblyStatusQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateAssemblyStatusDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAssemblyStatusDto) {
    return this.service.update(id, dto);
  }
}
