import { Module } from '@nestjs/common';
import { TerritorioController } from './territorio.controller';

@Module({ controllers: [TerritorioController] })
export class TerritorioModule {}
