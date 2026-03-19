import { PartialType } from '@nestjs/mapped-types';
import { CreateActiveSubstanceDto } from './create-active-substance.dto';

export class UpdateActiveSubstanceDto extends PartialType(CreateActiveSubstanceDto) {}
