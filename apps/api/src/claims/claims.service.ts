import {
  BadGatewayException, BadRequestException, Inject, Injectable,
  InternalServerErrorException, Logger, ServiceUnavailableException,
} from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../prisma.service';
import { assessmentRequest, checkedAssessment, geminiResponse, modelAssessment } from './assessment.schema';
import { ASSESSMENT_INSTRUCTIONS, PROMPT_VERSION } from './assessment.prompt';

@Injectable()
export class ClaimsService {
  private readonly logger = new Logger(ClaimsService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async assess(body: unknown) {
    const input = assessmentRequest.safeParse(body);
    if (!input.success) {
      throw new BadRequestException('Enter a claim, formula version and study text within the field limits.');
    }
    if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_MODEL) {
      throw new ServiceUnavailableException('Gemini is not configured. Set GEMINI_API_KEY and GEMINI_MODEL on the server. The dummy workflow works without them.');
    }

    let result: z.infer<typeof checkedAssessment>;
    let model: string;
    let providerResponseId: string;
    try {
      const http = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GEMINI_MODEL)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: ASSESSMENT_INSTRUCTIONS }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(input.data) }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: z.toJSONSchema(modelAssessment),
            candidateCount: 1,
            maxOutputTokens: 8192,
          },
        }),
      });
      if (!http.ok) throw new Error('Gemini request failed');
      const response = geminiResponse.parse(await http.json());
      if (response.promptFeedback?.blockReason) throw new Error('Gemini blocked the request');
      const text = response.candidates[0].content.parts.filter(part => !part.thought).map(part => part.text ?? '').join('');
      result = checkedAssessment.parse(JSON.parse(text));
      model = response.modelVersion;
      providerResponseId = response.responseId;
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
