import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        role: true,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        role: true,
      },
    });
  }
}