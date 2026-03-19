import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    UseGuards,
  } from '@nestjs/common';
  import { UsersService } from './users.service';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  
  @UseGuards(JwtAuthGuard)
  @Controller('users')
  export class UsersController {
    constructor(private readonly usersService: UsersService) {}
  
    @Get()
    findAll() {
      return this.usersService.findAll();
    }
  
    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
      return this.usersService.findById(id);
    }
  }