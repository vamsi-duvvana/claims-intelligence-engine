import { Module } from '@nestjs/common';
import { ClaimsController } from './claims/claims.controller';
import { ClaimsService } from './claims/claims.service';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [ClaimsController],
  providers: [PrismaService, ClaimsService],
})
export class AppModule {}
