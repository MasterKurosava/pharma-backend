import { PartialType } from '@nestjs/mapped-types';
import { CreateProductStatusDto } from './create-product-status.dto';

export class UpdateProductStatusDto extends PartialType(CreateProductStatusDto) {}
