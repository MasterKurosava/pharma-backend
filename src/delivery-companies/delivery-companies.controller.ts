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
import { DeliveryCompaniesService } from './delivery-companies.service';
import { CreateDeliveryCompanyDto } from './dto/create-delivery-company.dto';
import { UpdateDeliveryCompanyDto } from './dto/update-delivery-company.dto';
import { DeliveryCompanyQueryDto } from './dto/delivery-company-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('delivery-companies')
export class DeliveryCompaniesController {
  constructor(private readonly service: DeliveryCompaniesService) {}

  @Get()
  findAll(@Query() query: DeliveryCompanyQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateDeliveryCompanyDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDeliveryCompanyDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
