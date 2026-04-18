import { PartialType } from '@nestjs/mapped-types';
import { CreateProductStoragePlaceDto } from './create-product-storage-place.dto';

export class UpdateProductStoragePlaceDto extends PartialType(CreateProductStoragePlaceDto) {}
