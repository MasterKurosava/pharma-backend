import { IsInt, Min } from 'class-validator';

export class AssignResponsibleDto {
  @IsInt()
  @Min(1)
  responsibleUserId!: number;
}
