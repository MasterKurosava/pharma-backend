import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssemblyStatusesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.assemblyStatus.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async findById(id: number) {
    const status = await this.prisma.assemblyStatus.findUnique({ where: { id } });
    if (!status) {
      throw new NotFoundException('Статус сборки не найден');
    }
    return status;
  }
}
