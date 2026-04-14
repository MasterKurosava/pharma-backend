import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AssemblyStatusesService } from './assembly-statuses.service';

@UseGuards(JwtAuthGuard)
@Controller('assembly-statuses')
export class AssemblyStatusesController {
  constructor(private readonly service: AssemblyStatusesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }
}
