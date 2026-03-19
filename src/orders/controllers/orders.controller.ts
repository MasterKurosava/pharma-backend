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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrdersService } from '../services/orders.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { OrderQueryDto } from '../dto/order-query.dto';
import { OrdersSummaryQueryDto } from '../dto/orders-summary-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get('stats/summary')
  getSummary(@Query() query: OrdersSummaryQueryDto) {
    return this.ordersService.getSummary(query);
  }

  @Get(':id/history')
  getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.getHistory(id);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findById(id);
  }

  @Post()
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { userId: number; email: string; role: string },
  ) {
    return this.ordersService.create(dto, user.userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: { userId: number; email: string; role: string },
  ) {
    return this.ordersService.update(id, dto, user.userId);
  }
}
