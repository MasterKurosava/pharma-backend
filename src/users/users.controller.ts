import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    UseGuards,
  } from '@nestjs/common';
  import { UsersService } from './users.service';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { RolesGuard } from '../common/guards/roles.guard';
  import { Roles } from '../common/decorators/roles.decorator';
  import { CreateUserDto } from './dto/create-user.dto';
  import { UpdateUserDto } from './dto/update-user.dto';
  import { ChangeUserPasswordDto } from './dto/change-user-password.dto';
  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
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

    @Post()
    create(@Body() dto: CreateUserDto) {
      return this.usersService.create(dto);
    }

    @Put(':id')
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
      return this.usersService.update(id, dto);
    }

    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number) {
      return this.usersService.delete(id);
    }

    @Patch(':id/password')
    changePassword(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: ChangeUserPasswordDto,
    ) {
      return this.usersService.changePassword(id, dto.new_password);
    }
  }