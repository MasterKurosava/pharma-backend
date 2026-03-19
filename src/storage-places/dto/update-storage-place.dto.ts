import { PartialType } from '@nestjs/mapped-types';
import { CreateStoragePlaceDto } from './create-storage-place.dto';

export class UpdateStoragePlaceDto extends PartialType(CreateStoragePlaceDto) {}
