import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityExistenceService } from '../common/prechecks/entity-existence.service';
import { PrismaErrorMapperService } from '../common/prisma/prisma-error-mapper.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCityDto } from './dto/create-city.dto';
import { UpdateCityDto } from './dto/update-city.dto';
import { CityQueryDto } from './dto/city-query.dto';

@Injectable()
export class CitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly existence: EntityExistenceService,
    private readonly prismaErrorMapper: PrismaErrorMapperService,
  ) {}

  async findAll(query: CityQueryDto) {
    const where = {
      ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
      ...(query.countryId !== undefined ? { countryId: query.countryId } : {}),
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                region: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };

    return this.prisma.city.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    });
  }

  async findById(id: number) {
    const city = await this.prisma.city.findUnique({
      where: { id },
    });

    if (!city) {
      throw new NotFoundException('Город не найден');
    }

    return city;
  }

  async create(dto: CreateCityDto) {
    await this.existence.ensureRequiredById('country', dto.countryId, 'Страна не найдена');

    try {
      return this.prisma.city.create({
        data: {
          countryId: dto.countryId,
          name: dto.name.trim(),
          ...(dto.region !== undefined ? { region: dto.region.trim() } : {}),
          isActive: dto.isActive ?? true,
        },
      });
    } catch (error) {
      this.prismaErrorMapper.rethrow(error);
    }
  }

  async update(id: number, dto: UpdateCityDto) {
    await this.findById(id);

    if (dto.countryId !== undefined) {
      await this.existence.ensureRequiredById('country', dto.countryId, 'Страна не найдена');
    }

    try {
      return this.prisma.city.update({
        where: { id },
        data: {
          ...(dto.countryId !== undefined ? { countryId: dto.countryId } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.region !== undefined ? { region: dto.region.trim() } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    } catch (error) {
      this.prismaErrorMapper.rethrow(error);
    }
  }
}
