import { z } from 'zod';

export const createApplicationSchema = z
  .object({
    notes: z.string().trim().max(5000, 'Notes must be at most 5000 characters').optional(),
  })
  .strict();

export const updateApplicationSchema = z
  .object({
    notes: z
      .string()
      .trim()
      .max(5000, 'Notes must be at most 5000 characters')
      .nullable()
      .optional(),
  })
  .strict()
  .refine((value) => value.notes !== undefined, {
    message: 'Provide notes to update',
  });

export const uploadDocumentFieldsSchema = z
  .object({
    documentTypeId: z.string().min(1, 'documentTypeId is required'),
    replaceDocumentId: z.string().min(1).optional(),
  })
  .strict();

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type UploadDocumentFields = z.infer<typeof uploadDocumentFieldsSchema>;
