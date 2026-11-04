import {
  BadGatewayException, BadRequestException, Inject, Injectable,
  InternalServerErrorException, Logger, ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { PrismaService } from '../prisma.service';
import { assessmentRequest, checkedAssessment, modelAssessment } from './assessment.schema';
import { ASSESSMENT_INSTRUCTIONS, PROMPT_VERSION } from './assessment.prompt';

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OpenAI) private readonly openai: OpenAI | null,
  ) {}

  async assess(body: unknown) {
    const input = assessmentRequest.safeParse(body);
    if (!input.success) {
      throw new BadRequestException('Enter a claim, formula version and study text within the field limits.');
    }
    if (!this.openai || !process.env.OPENAI_MODEL) {
      throw new ServiceUnavailableException('Assessment is not configured. Set OPENAI_API_KEY and OPENAI_MODEL on the server.');
    }

    let result: z.infer<typeof checkedAssessment>;
    let model: string;
    let providerResponseId: string;
    try {
      const response = await this.openai.responses.parse({
        model: process.env.OPENAI_MODEL,
        store: false,
        instructions: ASSESSMENT_INSTRUCTIONS,
        input: [{ role: 'user', content: JSON.stringify(input.data) }],
        text: { format: zodTextFormat(modelAssessment, 'claim_assessment') },
      });
      if (response.status !== 'completed' || !response.output_parsed) {
        throw new Error('No complete assessment');
      }
      result = checkedAssessment.parse(response.output_parsed);
      model = response.model;
      providerResponseId = response.id;
    } catch {
      // Never log provider payloads: they can contain confidential study text.
      this.logger.warn('Provider did not return a valid assessment.');
      throw new BadGatewayException('The assessment service is unavailable. Please try again.');
    }

    let saved;
    try {
      // The nested write is atomic; no database transaction waits on the LLM.
      saved = await this.prisma.assessment.create({
        data: {
          claim: { create: { text: input.data.claim, formulaVersion: input.data.formulaVersion } },
          evidenceText: input.data.evidence,
          ...result,
          model,
          promptVersion: PROMPT_VERSION,
          providerResponseId,
        },
      });
    } catch {
      this.logger.error('Assessment could not be persisted.');
      throw new InternalServerErrorException('Could not save the assessment. Please try again.');
    }

    return {
      assessmentId: saved.id,
      claimId: saved.claimId,
      verdict: saved.verdict,
      justified: saved.verdict === 'SUPPORTED',
      confidence: saved.confidence,
      reasoning: saved.reasoning,
      missingEvidence: saved.missingEvidence,
      createdAt: saved.createdAt,
    };
  }
}
