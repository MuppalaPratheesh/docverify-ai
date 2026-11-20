import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth, requireRoles } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateRequest';
import { AppError } from '../middleware/errorHandler';
import {
  adminUserQuerySchema,
  auditLogQuerySchema,
  changeRoleSchema,
  documentTypeCreateSchema,
  documentTypeUpdateSchema,
  referenceSourceCreateSchema,
  referenceSourceUpdateSchema,
  verificationRuleCreateSchema,
  verificationRuleUpdateSchema,
} from '../validators/adminValidators';
import {
  adminChangeUserRole,
  createDocumentType,
  createReferenceSource,
  createVerificationRule,
  getAdminDashboard,
  listAdminDocumentTypes,
  listAdminUsers,
  listAuditLogs,
  listReferenceSources,
  listVerificationRules,
  updateDocumentType,
  updateReferenceSource,
  updateVerificationRule,
} from '../services/adminService';

const router = Router();

router.use(requireAuth, requireRoles(UserRole.ADMIN));

router.get('/dashboard', async (req, res, next) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const dashboard = await getAdminDashboard(req.user);
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
});

router.get('/users', async (req, res, next) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const query = adminUserQuerySchema.parse({
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      role: typeof req.query.role === 'string' ? req.query.role : undefined,
    });
    const users = await listAdminUsers(req.user, query);
    res.status(200).json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:userId/role', validateBody(changeRoleSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const user = await adminChangeUserRole(req.user, String(req.params.userId), req.body.role);
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

router.get('/document-types', async (req, res, next) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const documentTypes = await listAdminDocumentTypes(req.user);
    res.status(200).json({ success: true, data: { documentTypes } });
  } catch (error) {
    next(error);
  }
});

router.post('/document-types', validateBody(documentTypeCreateSchema), async (req, res, next) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const documentType = await createDocumentType(req.user, req.body);
    res.status(201).json({ success: true, data: { documentType } });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/document-types/:id',
  validateBody(documentTypeUpdateSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const documentType = await updateDocumentType(req.user, String(req.params.id), req.body);
      res.status(200).json({ success: true, data: { documentType } });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/verification-rules', async (req, res, next) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const rules = await listVerificationRules(req.user);
    res.status(200).json({ success: true, data: { rules } });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/verification-rules',
  validateBody(verificationRuleCreateSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const rule = await createVerificationRule(req.user, req.body);
      res.status(201).json({ success: true, data: { rule } });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/verification-rules/:id',
  validateBody(verificationRuleUpdateSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const rule = await updateVerificationRule(req.user, String(req.params.id), req.body);
      res.status(200).json({ success: true, data: { rule } });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/reference-sources', async (req, res, next) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const sources = await listReferenceSources(req.user);
    res.status(200).json({ success: true, data: { sources } });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/reference-sources',
  validateBody(referenceSourceCreateSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const source = await createReferenceSource(req.user, req.body);
      res.status(201).json({ success: true, data: { source } });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  '/reference-sources/:id',
  validateBody(referenceSourceUpdateSchema),
  async (req, res, next) => {
    try {
      if (!req.user) throw new AppError('Authentication required', 401);
      const source = await updateReferenceSource(req.user, String(req.params.id), req.body);
      res.status(200).json({ success: true, data: { source } });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/audit-logs', async (req, res, next) => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401);
    const query = auditLogQuerySchema.parse({
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      action: typeof req.query.action === 'string' ? req.query.action : undefined,
      entityType: typeof req.query.entityType === 'string' ? req.query.entityType : undefined,
      limit: typeof req.query.limit === 'string' ? req.query.limit : undefined,
    });
    const auditLogs = await listAuditLogs(req.user, query);
    res.status(200).json({ success: true, data: { auditLogs } });
  } catch (error) {
    next(error);
  }
});

export default router;
