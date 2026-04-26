import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OrderStatusConfigQueryDto } from './dto/order-status-config-query.dto';
import { OrderStatusConfigsService } from './order-status-configs.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateOrderStatusConfigDto } from './dto/update-order-status-config.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('order-status-configs')
export class OrderStatusConfigsController {
  constructor(private readonly service: OrderStatusConfigsService) {}

  @Get()
  findAll(@Query() query: OrderStatusConfigQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Roles('admin', 'manager')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusConfigDto,
  ) {
    return this.service.update(id, dto);
  }
}
