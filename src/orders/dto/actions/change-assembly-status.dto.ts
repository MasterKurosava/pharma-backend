import { IsInt, Min } from 'class-validator';

export class ChangeAssemblyStatusDto {
  @IsInt()
  @Min(1)
  assemblyStatusId!: number;
}
