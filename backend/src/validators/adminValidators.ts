import { UserRole } from '@prisma/client';
import { z } from 'zod';

export const adminUserQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  role: z.enum([UserRole.APPLICANT, UserRole.REVIEWER, UserRole.ADMIN]).optional(),
});

export const changeRoleSchema = z
  .object({
    role: z.enum([UserRole.APPLICANT, UserRole.REVIEWER, UserRole.ADMIN]),
  })
  .strict();

export const documentTypeCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    code: z
      .string()
      .trim()
      .min(2)
      .max(64)
      .regex(/^[A-Z][A-Z0-9_]*$/, 'Code must be uppercase letters, numbers and underscores'),
    description: z.string().trim().max(2000).optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const documentTypeUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const verificationRuleCreateSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(5000).optional(),
    documentTypeId: z.string().min(1),
    isActive: z.boolean().optional(),
    effectiveDate: z.string().trim().min(4, 'effectiveDate is required'),
  })
  .strict();

export const verificationRuleUpdateSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    documentTypeId: z.string().min(1).optional(),
    isActive: z.boolean().optional(),
    effectiveDate: z.string().trim().min(4).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const referenceSourceCreateSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    version: z.string().trim().min(1).max(64),
    effectiveDate: z.string().trim().min(4, 'effectiveDate is required'),
    sourceDescription: z.string().trim().max(5000).optional(),
  })
  .strict();

export const referenceSourceUpdateSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    version: z.string().trim().min(1).max(64).optional(),
    effectiveDate: z.string().trim().min(4).optional(),
    sourceDescription: z.string().trim().max(5000).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  });

export const auditLogQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  action: z.string().trim().max(100).optional(),
  entityType: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
export type DocumentTypeCreateInput = z.infer<typeof documentTypeCreateSchema>;
export type DocumentTypeUpdateInput = z.infer<typeof documentTypeUpdateSchema>;
export type VerificationRuleCreateInput = z.infer<typeof verificationRuleCreateSchema>;
export type VerificationRuleUpdateInput = z.infer<typeof verificationRuleUpdateSchema>;
export type ReferenceSourceCreateInput = z.infer<typeof referenceSourceCreateSchema>;
export type ReferenceSourceUpdateInput = z.infer<typeof referenceSourceUpdateSchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
