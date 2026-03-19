import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
  } from '@nestjs/common';
  import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
  import { CountriesService } from './countries.service';
  import { CreateCountryDto } from './dto/create-country.dto';
  import { UpdateCountryDto } from './dto/update-country.dto';
  import { CountryQueryDto } from './dto/country-query.dto';
  
  @UseGuards(JwtAuthGuard)
  @Controller('countries')
  export class CountriesController {
    constructor(private readonly countriesService: CountriesService) {}
  
    @Get()
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
  }