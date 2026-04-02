import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly PASSWORD_SALT_ROUNDS = 10;

  private sanitizeUser<T extends { passwordHash: string }>(user: T): Omit<T, 'passwordHash'> {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
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
    return users.map((user) => this.sanitizeUser(user));
  }

  async findById(id: number) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        role: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return this.sanitizeUser(user);
  }

  async create(dto: CreateUserDto) {
    const login = dto.login.trim();
    const password = dto.password.trim();
    const firstName = dto.first_name.trim();
    const lastName = dto.last_name.trim();

    if (!login) {
      throw new BadRequestException('Логин обязателен');
    }
    if (!password) {
      throw new BadRequestException('Пароль не может быть пустым');
    }

    const passwordHash = await bcrypt.hash(password, UsersService.PASSWORD_SALT_ROUNDS);

    try {
      const created = await this.prisma.user.create({
        data: {
          login,
          email: login,
          passwordHash,
          firstName,
          lastName,
          roleId: dto.role_id,
          isActive: true,
        },
        include: { role: true },
      });
      return this.sanitizeUser(created);
    } catch (error) {
      this.rethrowConstraintError(error);
    }
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.ensureUserExists(id);

    const data: Prisma.UserUncheckedUpdateInput = {
      ...(dto.login !== undefined ? { login: dto.login.trim(), email: dto.login.trim() } : {}),
      ...(dto.first_name !== undefined ? { firstName: dto.first_name.trim() } : {}),
      ...(dto.last_name !== undefined ? { lastName: dto.last_name.trim() } : {}),
      ...(dto.role_id !== undefined ? { roleId: dto.role_id } : {}),
    };

    if (dto.login !== undefined && !dto.login.trim()) {
      throw new BadRequestException('Логин обязателен');
    }

    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data,
        include: { role: true },
      });
      return this.sanitizeUser(updated);
    } catch (error) {
      this.rethrowConstraintError(error);
    }
  }

  async delete(id: number) {
    await this.ensureUserExists(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    return { success: true };
  }

  async changePassword(id: number, newPassword: string) {
    await this.ensureUserExists(id);
    if (!newPassword.trim()) {
      throw new BadRequestException('Новый пароль не может быть пустым');
    }

    const passwordHash = await bcrypt.hash(newPassword.trim(), UsersService.PASSWORD_SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    return { success: true };
  }

  private async ensureUserExists(id: number) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
  }

  private rethrowConstraintError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new BadRequestException('Логин уже существует');
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new BadRequestException('Указанная роль не найдена');
    }
    throw error;
  }
}