import { PartialType } from '@nestjs/mapped-types';
import { CreateClientStatusDto } from './create-client-status.dto';

export class UpdateClientStatusDto extends PartialType(CreateClientStatusDto) {}
