import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EntityExistenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getRequiredById<T = any>(
    model: string,
    id: number,
    notFoundMessage: string,
    db: any = this.prisma,
    select?: Record<string, boolean>,
  ): Promise<T> {
    const delegate = db[model];
    if (!delegate?.findUnique) {
      throw new Error(`Prisma model delegate "${model}" is not available`);
    }

    let entity: unknown;

    try {
      entity = await delegate.findFirst({
        where: { id, deletedAt: null },
        ...(select ? { select } : {}),
      });
    } catch {
      entity = await delegate.findUnique({
        where: { id },
        ...(select ? { select } : {}),
      });
    }

    if (!entity) {
      throw new NotFoundException(notFoundMessage);
    }

    return entity as T;
  }

  async ensureRequiredById(
    model: string,
    id: number,
    notFoundMessage: string,
    db: any = this.prisma,
  ) {
    await this.getRequiredById(model, id, notFoundMessage, db, { id: true });
  }
}

