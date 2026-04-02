import {
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Query,
    UseGuards,
  UseInterceptors,
  } from '@nestjs/common';
  import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { CountriesService } from './countries.service';
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
  
  }