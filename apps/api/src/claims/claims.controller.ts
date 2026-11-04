import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClaimsService } from './claims.service';

@Controller('api/claims')
export class ClaimsController {
  constructor(@Inject(ClaimsService) private readonly claims: ClaimsService) {}

  @Post('assess')
  assess(@Body() body: unknown) {
    return this.claims.assess(body);
  }
}
