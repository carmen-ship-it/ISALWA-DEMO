import { Controller, Get } from '@nestjs/common';
import { PulseService } from './pulse.service';

@Controller('pulse')
export class PulseController {
  constructor(private readonly pulse: PulseService) {}

  @Get()
  getPulse() {
    return this.pulse.getPulse();
  }
}
