import { PartialType } from '@nestjs/mapped-types';
import { CreateAssemblyStatusDto } from './create-assembly-status.dto';

export class UpdateAssemblyStatusDto extends PartialType(CreateAssemblyStatusDto) {}
