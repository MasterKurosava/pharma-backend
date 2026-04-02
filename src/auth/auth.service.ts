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
        where: { login: dto.login },
        include: { role: true },
      });
  
      if (!user || user.deletedAt || !user.isActive) {
        throw new UnauthorizedException('Неверный логин или пароль');
      }
  
      const isPasswordValid = await bcrypt.compare(
        dto.password,
        user.passwordHash,
      );
  
      if (!isPasswordValid) {
        throw new UnauthorizedException('Неверный логин или пароль');
      }
  
      const payload = {
        sub: user.id,
        login: user.login,
        role: user.role.code,
      };
  
      return {
        accessToken: await this.jwtService.signAsync(payload),
        user: {
          id: user.id,
          login: user.login,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      };
    }
  }