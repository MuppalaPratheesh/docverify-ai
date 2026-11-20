import { ApplicationStatus, ReviewDecision } from '@prisma/client';
import { z } from 'zod';

export const reviewerApplicationQuerySchema = z.object({
  status: z
    .enum([
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.NEEDS_INFORMATION,
      ApplicationStatus.COMPLETED,
    ])
    .optional(),
  q: z.string().trim().max(200).optional(),
});

export const recordDecisionSchema = z
  .object({
    decision: z.enum([
      ReviewDecision.APPROVED,
      ReviewDecision.NEEDS_INFORMATION,
      ReviewDecision.REJECTED,
    ]),
    comment: z.string().trim().max(5000, 'Comment must be at most 5000 characters').optional(),
  })
  .strict();

export const createDocumentRequestSchema = z
  .object({
    documentTypeId: z.string().min(1, 'Document type is required'),
    message: z
      .string()
      .trim()
      .min(10, 'Provide an explanation of at least 10 characters')
      .max(5000, 'Explanation must be at most 5000 characters'),
  })
  .strict();

export const updateReviewerNotesSchema = z
  .object({
    reviewerNotes: z
      .string()
      .trim()
      .max(5000, 'Reviewer notes must be at most 5000 characters')
      .nullable(),
  })
  .strict();

export type ReviewerApplicationQuery = z.infer<typeof reviewerApplicationQuerySchema>;
export type RecordDecisionInput = z.infer<typeof recordDecisionSchema>;
export type CreateDocumentRequestInput = z.infer<typeof createDocumentRequestSchema>;
export type UpdateReviewerNotesInput = z.infer<typeof updateReviewerNotesSchema>;
