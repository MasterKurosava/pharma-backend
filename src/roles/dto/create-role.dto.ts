import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsString,
  Matches,
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

export class CreateRoleDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9_]+$/)
  code!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  allowedRoutes!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ROLE_TABLE_GROUP_VALUES, { each: true })
  allowedOrderTableGroups!: RoleTableGroup[];
}
