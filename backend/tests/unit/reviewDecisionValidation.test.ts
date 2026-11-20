import { ReviewDecision } from '@prisma/client';
import {
  createDocumentRequestSchema,
  recordDecisionSchema,
} from '../../src/validators/reviewerValidators';

describe('Review decision validation', () => {
  it('accepts APPROVED, REJECTED and NEEDS_INFORMATION decisions', () => {
    for (const decision of [
      ReviewDecision.APPROVED,
      ReviewDecision.REJECTED,
      ReviewDecision.NEEDS_INFORMATION,
    ]) {
      const parsed = recordDecisionSchema.parse({
        decision,
        comment: 'Synthetic reviewer comment',
      });
      expect(parsed.decision).toBe(decision);
    }
  });

  it('accepts a decision without a comment', () => {
    const parsed = recordDecisionSchema.parse({
      decision: ReviewDecision.APPROVED,
    });

    expect(parsed.decision).toBe(ReviewDecision.APPROVED);
    expect(parsed.comment).toBeUndefined();
  });

  it('rejects unknown decision values', () => {
    const result = recordDecisionSchema.safeParse({
      decision: 'MAYBE',
      comment: 'Invalid',
    });

    expect(result.success).toBe(false);
  });

  it('rejects oversized comments', () => {
    const result = recordDecisionSchema.safeParse({
      decision: ReviewDecision.REJECTED,
      comment: 'x'.repeat(5001),
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown keys on decision payloads', () => {
    const result = recordDecisionSchema.safeParse({
      decision: ReviewDecision.APPROVED,
      status: 'COMPLETED',
    });

    expect(result.success).toBe(false);
  });

  it('requires a meaningful message for additional document requests', () => {
    const tooShort = createDocumentRequestSchema.safeParse({
      documentTypeId: 'type-1',
      message: 'short',
    });
    expect(tooShort.success).toBe(false);

    const valid = createDocumentRequestSchema.parse({
      documentTypeId: 'type-1',
      message: 'Please upload a synthetic language certificate.',
    });
    expect(valid.documentTypeId).toBe('type-1');
  });
});
