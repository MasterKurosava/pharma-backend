import { PartialType } from '@nestjs/mapped-types';
import { CreateProductOrderSourceDto } from './create-product-order-source.dto';

export class UpdateProductOrderSourceDto extends PartialType(CreateProductOrderSourceDto) {}
