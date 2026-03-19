import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { UpdateOrderDto } from './update-order.dto';
import { SaveOrderItemDto } from './items/save-order-item.dto';

export class UpdateOrderFullDto extends UpdateOrderDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveOrderItemDto)
  items?: SaveOrderItemDto[];
}
