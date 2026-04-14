import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

const ROLE_TABLE_GROUP_VALUES = [
  'REQUESTS',
  'PICKUP',
  'ALMATY_DELIVERY',
  'RK_DELIVERY',
  'ARCHIVE',
] as const;

type RoleTableGroup = (typeof ROLE_TABLE_GROUP_VALUES)[number];

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoutes?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(ROLE_TABLE_GROUP_VALUES, { each: true })
  allowedOrderTableGroups?: RoleTableGroup[];
}
