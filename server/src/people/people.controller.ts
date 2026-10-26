import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { CreatePersonDto, PersonQueryDto, RenamePersonDto } from './people.dto.js';
import { PeopleService } from './people.service.js';

@Controller('people')
export class PeopleController {
  constructor(private readonly people: PeopleService) {}

  @Get()
  list(@Query() query: PersonQueryDto, @Query('includeArchived') includeArchived?: string) {
    return this.people.list(query.role, query.limit, includeArchived === 'true');
  }

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() body: CreatePersonDto) {
    return this.people.create(body);
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number, @Query('includeArchived') includeArchived?: string) {
    return this.people.detail(id, includeArchived === 'true');
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  rename(@Param('id', ParseIntPipe) id: number, @Body() body: RenamePersonDto) {
    return this.people.rename(id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminGuard)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.people.remove(id);
  }
}
