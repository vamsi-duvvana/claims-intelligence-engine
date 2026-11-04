import { z } from 'zod';

export const assessmentRequest = z.object({
  claim: z.string().trim().min(1).max(2000),
  formulaVersion: z.string().trim().min(1).max(120),
  evidence: z.string().trim().min(1).max(30000),
}).strict();

export const modelAssessment = z.object({
  verdict: z.enum(['SUPPORTED', 'NOT_SUPPORTED', 'INSUFFICIENT_EVIDENCE']),
  confidence: z.number(),
  reasoning: z.string(),
  missingEvidence: z.array(z.string()),
}).strict();

// Keep business bounds independent of the provider's supported JSON Schema subset.
export const checkedAssessment = modelAssessment.extend({
  confidence: z.number().finite().min(0).max(1),
  reasoning: z.string().trim().min(1).max(6000),
  missingEvidence: z.array(z.string().trim().min(1).max(500)).max(20),
});
