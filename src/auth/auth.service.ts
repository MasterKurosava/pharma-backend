import {
    Injectable,
    UnauthorizedException,
  } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import * as bcrypt from 'bcrypt';
  import { PrismaService } from '../prisma/prisma.service';
  import { LoginDto } from './dto/login.dto';
  
  @Injectable()
  export class AuthService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly jwtService: JwtService,
    ) {}
  
    async login(dto: LoginDto) {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
        include: { role: true },
      });
  
      if (!user || user.deletedAt || !user.isActive) {
        throw new UnauthorizedException('Неверный email или пароль');
      }
  
      const isPasswordValid = await bcrypt.compare(
        dto.password,
        user.passwordHash,
      );
  
      if (!isPasswordValid) {
        throw new UnauthorizedException('Неверный email или пароль');
      }
  
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role.code,
      };
  
      return {
        accessToken: await this.jwtService.signAsync(payload),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      };
    }
  }