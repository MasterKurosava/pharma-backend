import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderItemsService } from '../services/order-items.service';
import { AddOrderItemDto } from '../dto/items/add-order-item.dto';
import { UpdateOrderItemQuantityDto } from '../dto/items/update-order-item-quantity.dto';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderItemsController {
  constructor(private readonly orderItemsService: OrderItemsService) {}

  @Post(':id/items')
  addItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddOrderItemDto,
    @CurrentUser() user: { userId: number; email: string; role: string },
  ) {
    return this.orderItemsService.addItem(id, dto, user.userId);
  }

  @Patch(':id/items/:itemId')
  changeQuantity(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateOrderItemQuantityDto,
    @CurrentUser() user: { userId: number; email: string; role: string },
  ) {
    return this.orderItemsService.changeQuantity(id, itemId, dto, user.userId);
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @Param('id', ParseIntPipe) id: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: { userId: number; email: string; role: string },
  ) {
    return this.orderItemsService.removeItem(id, itemId, user.userId);
  }
}

