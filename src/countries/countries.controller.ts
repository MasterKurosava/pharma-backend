import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
  UseInterceptors,
  } from '@nestjs/common';
  import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { CountriesService } from './countries.service';
  import { CreateCountryDto } from './dto/create-country.dto';
  import { UpdateCountryDto } from './dto/update-country.dto';
  import { CountryQueryDto } from './dto/country-query.dto';
  
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(CacheInterceptor)
  @Controller('countries')
  export class CountriesController {
    constructor(private readonly countriesService: CountriesService) {}
  
    @Get()
    @CacheTTL(900)
    findAll(@Query() query: CountryQueryDto) {
      return this.countriesService.findAll(query);
    }
  
    @Get(':id')
    findById(@Param('id', ParseIntPipe) id: number) {
      return this.countriesService.findById(id);
    }
  
    @Post()
    create(@Body() dto: CreateCountryDto) {
      return this.countriesService.create(dto);
    }
  
    @Patch(':id')
    update(
      @Param('id', ParseIntPipe) id: number,
      @Body() dto: UpdateCountryDto,
    ) {
      return this.countriesService.update(id, dto);
    }

    @Delete(':id')
    delete(@Param('id', ParseIntPipe) id: number) {
      return this.countriesService.delete(id);
    }
  }