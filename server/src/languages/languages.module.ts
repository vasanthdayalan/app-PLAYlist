import { Module } from '@nestjs/common';
import { LanguagesController } from './languages.controller.js';

@Module({
  controllers: [LanguagesController],
})
export class LanguagesModule {}
