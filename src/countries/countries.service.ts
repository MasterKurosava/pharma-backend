import {
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';
  import { CreateCountryDto } from './dto/create-country.dto';
  import { UpdateCountryDto } from './dto/update-country.dto';
  import { CountryQueryDto } from './dto/country-query.dto';
  
  @Injectable()
  export class CountriesService {
    constructor(private readonly prisma: PrismaService) {}
  
    async findAll(query: CountryQueryDto) {
      const where = {
        ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
        ...(query.search
          ? {
              OR: [
                {
                  name: { contains: query.search, mode: 'insensitive' as const, },
                },
              ],
            }
          : {}),
      };
  
      return this.prisma.country.findMany({
        where,
        orderBy: [{ name: 'asc' }],
      });
    }
  
    async findById(id: number) {
      const country = await this.prisma.country.findUnique({
        where: { id },
      });
  
      if (!country) {
        throw new NotFoundException('Страна не найдена');
      }
  
      return country;
    }
  
    async create(dto: CreateCountryDto) {
      return this.prisma.country.create({
        data: {
          name: dto.name.trim(),
          isActive: dto.isActive ?? true,
        },
      });
    }
  
    async update(id: number, dto: UpdateCountryDto) {
      await this.findById(id);
  
      return this.prisma.country.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });
    }

    async delete(id: number) {
      await this.findById(id);
      return this.prisma.country.delete({ where: { id } });
    }
  }