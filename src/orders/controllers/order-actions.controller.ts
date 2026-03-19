import { Body, Controller, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AssignResponsibleDto } from '../dto/actions/assign-responsible.dto';
import { ChangeAssemblyStatusDto } from '../dto/actions/change-assembly-status.dto';
import { ChangeOrderStatusDto } from '../dto/actions/change-order-status.dto';
import { ChangePaymentStatusDto } from '../dto/actions/change-payment-status.dto';
import { ChangeStoragePlaceDto } from '../dto/actions/change-storage-place.dto';
import { UpdateOrderPaymentDto } from '../dto/actions/update-order-payment.dto';
import { OrderActionsService } from '../services/order-actions.service';

@UseGuards(JwtAuthGuard)
@Controller('orders/:id/actions')
export class OrderActionsController {
  constructor(private readonly orderActionsService: OrderActionsService) {}

  @Post('cancel')
  cancel(@Param('id', ParseIntPipe) orderId: number, @CurrentUser() user: { userId: number }) {
    return this.orderActionsService.cancel(orderId, user.userId);
  }

  @Post('close')
  close(@Param('id', ParseIntPipe) orderId: number, @CurrentUser() user: { userId: number }) {
    return this.orderActionsService.close(orderId, user.userId);
  }

  @Post('change-order-status')
  changeOrderStatus(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: ChangeOrderStatusDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.orderActionsService.changeOrderStatus(orderId, dto.orderStatusId, user.userId);
  }

  @Post('change-payment-status')
  changePaymentStatus(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: ChangePaymentStatusDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.orderActionsService.changePaymentStatus(orderId, dto.paymentStatusId, user.userId);
  }

  @Post('change-assembly-status')
  changeAssemblyStatus(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: ChangeAssemblyStatusDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.orderActionsService.changeAssemblyStatus(orderId, dto.assemblyStatusId, user.userId);
  }

  @Post('assign-responsible')
  assignResponsible(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: AssignResponsibleDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.orderActionsService.assignResponsible(orderId, dto.responsibleUserId, user.userId);
  }

  @Post('change-storage-place')
  changeStoragePlace(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: ChangeStoragePlaceDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.orderActionsService.changeStoragePlace(orderId, dto.storagePlaceId, user.userId);
  }

  @Post('update-payment')
  updatePayment(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: UpdateOrderPaymentDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.orderActionsService.updatePayment(orderId, dto, user.userId);
  }
}
