import 'reflect-metadata';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { json } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ClaimsController } from '../src/claims/claims.controller';
import { ClaimsService } from '../src/claims/claims.service';
import { PrismaService } from '../src/prisma.service';

const input = { claim: 'Reduces wrinkles by 20% in 4 weeks', formulaVersion: 'FORMULA-v3', evidence: 'Synthetic study text.' };
const supported = { verdict: 'SUPPORTED', confidence: 0.9, reasoning: 'The supplied study supports the stated endpoint and timepoint.', missingEvidence: [] };
const completed = (output = supported) => ({
  candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(output), thought: false }] } }],
  modelVersion: 'gemini-test', responseId: 'response-test',
});

describe('POST /api/claims/assess', () => {
  let app: INestApplication;
  const fetchMock = vi.fn();
  const create = vi.fn();

  beforeEach(async () => {
    vi.stubEnv('GEMINI_MODEL', 'gemini-test');
    vi.stubEnv('GEMINI_API_KEY', 'test-only-key');
    fetchMock.mockReset().mockImplementation(async () => Response.json(completed()));
    vi.stubGlobal('fetch', fetchMock);
    create.mockReset().mockImplementation(async ({ data }) => ({
      ...data, id: 'assessment-test', claimId: 'claim-test', createdAt: new Date('2026-11-04T00:00:00Z'),
    }));
    const module = await Test.createTestingModule({
      controllers: [ClaimsController],
      providers: [
        ClaimsService,
        { provide: PrismaService, useValue: { assessment: { create } } },
      ],
    }).compile();
    app = module.createNestApplication({ bodyParser: false, logger: false });
    app.use(json({ limit: '128kb' }));
    await app.init();
  });

  afterEach(async () => { await app.close(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it.each([
    { ...input, claim: '   ' },
    { ...input, evidence: '' },
    { ...input, formulaVersion: 123 },
    { ...input, evidence: 'x'.repeat(30001) },
    { ...input, approved: true },
  ])('rejects invalid input without calling the provider or database', async body => {
    await request(app.getHttpServer()).post('/api/claims/assess').send(body).expect(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects oversized HTTP bodies before assessment', async () => {
    await request(app.getHttpServer()).post('/api/claims/assess')
      .send({ ...input, evidence: 'x'.repeat(140000) }).expect(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['SUPPORTED', 'NOT_SUPPORTED', 'INSUFFICIENT_EVIDENCE'])('persists and returns %s consistently', async verdict => {
    fetchMock.mockImplementation(async () => Response.json(completed({ ...supported, verdict })));
    const { body } = await request(app.getHttpServer()).post('/api/claims/assess')
      .send({ ...input, claim: `  ${input.claim}  ` }).expect(201);
    expect(body).toMatchObject({ assessmentId: 'assessment-test', claimId: 'claim-test', verdict, justified: verdict === 'SUPPORTED', confidence: 0.9 });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({
      claim: { create: { text: input.claim, formulaVersion: input.formulaVersion } },
      evidenceText: input.evidence, verdict, promptVersion: 'claims-v1', model: 'gemini-test',
    }) });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
    expect(url).not.toContain('test-only-key');
    expect(options.headers['x-goog-api-key']).toBe('test-only-key');
    const payload = JSON.parse(options.body);
    expect(payload.generationConfig.responseMimeType).toBe('application/json');
    expect(JSON.parse(payload.contents[0].parts[0].text).claim).toBe(input.claim);
  });

  it('never translates a provider outage into an unsupported claim', async () => {
    fetchMock.mockRejectedValue(new Error('private provider error'));
    const { body } = await request(app.getHttpServer()).post('/api/claims/assess').send(input).expect(502);
    expect(body.message).not.toContain('private provider error');
    expect(body.justified).toBeUndefined();
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    { candidates: [], modelVersion: 'gemini-test', responseId: 'blocked', promptFeedback: { blockReason: 'SAFETY' } },
    { ...completed(), candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: JSON.stringify(supported) }] } }] },
    completed({ ...supported, confidence: 1.2 }),
    completed({ ...supported, reasoning: '  ' }),
    completed({ ...supported, verdict: 'MAYBE' }),
  ])('rejects refused, incomplete or invalid model output', async response => {
    fetchMock.mockImplementation(async () => Response.json(response));
    await request(app.getHttpServer()).post('/api/claims/assess').send(input).expect(502);
    expect(create).not.toHaveBeenCalled();
  });

  it('returns no success result when persistence fails', async () => {
    create.mockRejectedValue(new Error('private connection string'));
    const { body } = await request(app.getHttpServer()).post('/api/claims/assess').send(input).expect(500);
    expect(body.message).not.toContain('private connection string');
    expect(body.assessmentId).toBeUndefined();
  });

  it('handles a Gemini HTTP error without exposing its body or saving a result', async () => {
    fetchMock.mockImplementation(async () => new Response('private provider details', { status: 429 }));
    const { body } = await request(app.getHttpServer()).post('/api/claims/assess').send(input).expect(502);
    expect(body.message).not.toContain('private provider details');
    expect(create).not.toHaveBeenCalled();
  });

  it('ignores thought parts and parses only the final structured response', async () => {
    const response = completed();
    response.candidates[0].content.parts.unshift({ text: 'Not JSON: internal thought', thought: true });
    fetchMock.mockImplementation(async () => Response.json(response));
    await request(app.getHttpServer()).post('/api/claims/assess').send(input).expect(201);
  });

  it('explains missing model configuration without calling the provider', async () => {
    vi.stubEnv('GEMINI_MODEL', '');
    await request(app.getHttpServer()).post('/api/claims/assess').send(input).expect(503);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});
