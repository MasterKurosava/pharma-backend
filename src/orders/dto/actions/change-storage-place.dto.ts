import { IsInt, Min } from 'class-validator';

export class ChangeStoragePlaceDto {
  @IsInt()
  @Min(1)
  storagePlaceId!: number;
}
