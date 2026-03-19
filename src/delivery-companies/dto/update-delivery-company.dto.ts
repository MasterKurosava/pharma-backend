import { PartialType } from '@nestjs/mapped-types';
import { CreateDeliveryCompanyDto } from './create-delivery-company.dto';

export class UpdateDeliveryCompanyDto extends PartialType(CreateDeliveryCompanyDto) {}
