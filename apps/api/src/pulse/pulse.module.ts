import { Module } from '@nestjs/common';
import { PulseController } from './pulse.controller';
import { PulseService } from './pulse.service';

@Module({
  controllers: [PulseController],
  providers: [PulseService],
})
export class PulseModule {}
