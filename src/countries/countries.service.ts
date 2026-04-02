import {
    Injectable,
    NotFoundException,
  } from '@nestjs/common';
  import { PrismaService } from '../prisma/prisma.service';
  import { CountryQueryDto } from './dto/country-query.dto';
  
  @Injectable()
  export class CountriesService {
    constructor(private readonly prisma: PrismaService) {}
  
    async findAll(query: CountryQueryDto) {
      const where = {
        isActive: true,
        ...(query.search
          ? {
              OR: [
                {
                  name: { contains: query.search, mode: 'insensitive' as const, },
                },
                {
                  code: { contains: query.search, mode: 'insensitive' as const, },
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
      const country = await this.prisma.country.findFirst({
        where: { id, isActive: true },
      });
  
      if (!country) {
        throw new NotFoundException('Страна не найдена');
      }
  
      return country;
    }
  
  }