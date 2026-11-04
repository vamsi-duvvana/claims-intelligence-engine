import { Module } from '@nestjs/common';
import OpenAI from 'openai';
import { ClaimsController } from './claims/claims.controller';
import { ClaimsService } from './claims/claims.service';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [ClaimsController],
  providers: [
    PrismaService,
    ClaimsService,
    {
      provide: OpenAI,
      useFactory: () => process.env.OPENAI_API_KEY
        ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 45000, maxRetries: 0 })
        : null,
    },
  ],
})
export class AppModule {}
