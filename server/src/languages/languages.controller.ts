import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { LANGUAGES } from './languages.constants.js';

@Controller('languages')
export class LanguagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(): Promise<{ id: number; name: string }[]> {
    const rows = await this.prisma.language.findMany({ select: { id: true, name: true } });
    const order = new Map<string, number>(LANGUAGES.map((name, index) => [name, index]));
    return rows.sort((a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0));
  }
}
