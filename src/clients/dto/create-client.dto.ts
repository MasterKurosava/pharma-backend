import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateClientDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  @IsString()
  @Length(1, 50)
  phone!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  clientStatusId?: number;

  @IsOptional()
  @IsString()
  @Length(1, 1000)
  note?: string;
}
