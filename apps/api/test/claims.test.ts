import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { json } from 'express';
import OpenAI from 'openai';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClaimsController } from '../src/claims/claims.controller';
import { ClaimsService } from '../src/claims/claims.service';
import { PrismaService } from '../src/prisma.service';

const input = { claim: 'Reduces wrinkles by 20% in 4 weeks', formulaVersion: 'FORMULA-v3', evidence: 'Synthetic study text.' };
const supported = { verdict: 'SUPPORTED', confidence: 0.9, reasoning: 'The supplied study supports the stated endpoint and timepoint.', missingEvidence: [] };
const completed = (output = supported) => ({ status: 'completed', output_parsed: output, model: 'test-model', id: 'response-test' });

describe('POST /api/claims/assess', () => {
  let app: INestApplication;
  const parse = vi.fn();
  const create = vi.fn();

  beforeEach(async () => {
    vi.stubEnv('OPENAI_MODEL', 'test-model');
    parse.mockReset().mockResolvedValue(completed());
    create.mockReset().mockImplementation(async ({ data }) => ({
      ...data, id: 'assessment-test', claimId: 'claim-test', createdAt: new Date('2026-11-04T00:00:00Z'),
    }));
    const module = await Test.createTestingModule({
      controllers: [ClaimsController],
      providers: [
        ClaimsService,
        { provide: OpenAI, useValue: { responses: { parse } } },
        { provide: PrismaService, useValue: { assessment: { create } } },
      ],
    }).compile();
    app = module.createNestApplication({ bodyParser: false, logger: false });
    app.use(json({ limit: '128kb' }));
    await app.init();
  });

  afterEach(async () => { await app.close(); vi.unstubAllEnvs(); });

  it.each([
    { ...input, claim: '   ' },
    { ...input, evidence: '' },
    { ...input, formulaVersion: 123 },
    { ...input, evidence: 'x'.repeat(30001) },
    { ...input, approved: true },
  ])('rejects invalid input without calling the provider or database', async body => {
    await request(app.getHttpServer()).post('/api/claims/assess').send(body).expect(400);
    expect(parse).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects oversized HTTP bodies before assessment', async () => {
    await request(app.getHttpServer()).post('/api/claims/assess')
      .send({ ...input, evidence: 'x'.repeat(140000) }).expect(413);
    expect(parse).not.toHaveBeenCalled();
  });

  it.each(['SUPPORTED', 'NOT_SUPPORTED', 'INSUFFICIENT_EVIDENCE'])('persists and returns %s consistently', async verdict => {
    parse.mockResolvedValue(completed({ ...supported, verdict }));
    const { body } = await request(app.getHttpServer()).post('/api/claims/assess')
      .send({ ...input, claim: `  ${input.claim}  ` }).expect(201);
    expect(body).toMatchObject({ assessmentId: 'assessment-test', claimId: 'claim-test', verdict, justified: verdict === 'SUPPORTED', confidence: 0.9 });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({
      claim: { create: { text: input.claim, formulaVersion: input.formulaVersion } },
      evidenceText: input.evidence, verdict, promptVersion: 'claims-v1', model: 'test-model',
    }) });
    expect(parse).toHaveBeenCalledWith(expect.objectContaining({ store: false, model: 'test-model' }));
  });

  it('never translates a provider outage into an unsupported claim', async () => {
    parse.mockRejectedValue(new Error('private provider error'));
    const { body } = await request(app.getHttpServer()).post('/api/claims/assess').send(input).expect(502);
    expect(body.message).not.toContain('private provider error');
    expect(body.justified).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    { status: 'completed', output_parsed: null },
    { status: 'incomplete', output_parsed: supported },
    completed({ ...supported, confidence: 1.2 }),
    completed({ ...supported, reasoning: '  ' }),
    completed({ ...supported, verdict: 'MAYBE' }),
  ])('rejects refused, incomplete or invalid model output', async response => {
    parse.mockResolvedValue(response);
    await request(app.getHttpServer()).post('/api/claims/assess').send(input).expect(502);
    expect(create).not.toHaveBeenCalled();
  });

  it('returns no success result when persistence fails', async () => {
    create.mockRejectedValue(new Error('private connection string'));
    const { body } = await request(app.getHttpServer()).post('/api/claims/assess').send(input).expect(500);
    expect(body.message).not.toContain('private connection string');
    expect(body.assessmentId).toBeUndefined();
  });

  it('explains missing model configuration without calling the provider', async () => {
    vi.stubEnv('OPENAI_MODEL', '');
    await request(app.getHttpServer()).post('/api/claims/assess').send(input).expect(503);
    expect(parse).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
