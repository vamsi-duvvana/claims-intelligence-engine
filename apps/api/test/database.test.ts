import 'reflect-metadata';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

// Only records bearing this unique test marker are removed during cleanup.
const marker = `integration-${randomUUID()}`;
const result = { verdict: 'INSUFFICIENT_EVIDENCE', confidence: 0.92, reasoning: 'Week-four results are not reported.', missingEvidence: ['Week-four results'] };

describe('HTTP → service → PostgreSQL', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    vi.stubEnv('GEMINI_MODEL', 'gemini-test');
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => Response.json({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(result) }] } }],
      modelVersion: 'gemini-test', responseId: 'synthetic-response',
    })));
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ logger: false });
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.assessment.deleteMany({ where: { claim: { formulaVersion: marker } } });
      await prisma.claim.deleteMany({ where: { formulaVersion: marker } });
    }
    if (app) await app.close();
    vi.unstubAllEnvs(); vi.unstubAllGlobals();
  });

  it('returns exactly the assessment saved in the database', async () => {
    const { body } = await request(app.getHttpServer()).post('/api/claims/assess').send({
      claim: 'Reduces wrinkles by 20% in 4 weeks', formulaVersion: marker, evidence: 'Synthetic eight-week study.',
    }).expect(201);
    const saved = await prisma.assessment.findUniqueOrThrow({ where: { id: body.assessmentId }, include: { claim: true } });
    expect(body).toMatchObject({ claimId: saved.claimId, verdict: saved.verdict, confidence: saved.confidence, reasoning: saved.reasoning, justified: false });
    expect(saved.claim.formulaVersion).toBe(marker);
    expect(saved.evidenceText).toBe('Synthetic eight-week study.');
    expect(saved.promptVersion).toBe('claims-v1');
  });

  it('rolls back the related claim if a database constraint rejects the assessment', async () => {
    const before = await prisma.claim.count({ where: { formulaVersion: marker } });
    await expect(prisma.assessment.create({ data: {
      claim: { create: { text: 'Synthetic rollback case', formulaVersion: marker } },
      evidenceText: 'Synthetic', ...result, verdict: 'INSUFFICIENT_EVIDENCE', confidence: 1.5,
      model: 'test-model', promptVersion: 'claims-v1', providerResponseId: 'rollback-test',
    } })).rejects.toThrow();
    expect(await prisma.claim.count({ where: { formulaVersion: marker } })).toBe(before);
  });
});
