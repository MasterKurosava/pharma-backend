import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';

@Injectable()
export class PrismaErrorMapperService {
  rethrow(error: unknown): never {
    const code = (error as { code?: string } | null)?.code;

    if (code === 'P2002') {
      throw new ConflictException('Запись с такими уникальными данными уже существует');
    }

    if (code === 'P2003') {
      throw new BadRequestException('Передана некорректная связанная сущность');
    }

    if (code === 'P2025') {
      throw new BadRequestException('Запрашиваемая запись не найдена');
    }

    throw error;
  }
}

