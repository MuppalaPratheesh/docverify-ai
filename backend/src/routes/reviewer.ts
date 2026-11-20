import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth, requireRoles } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateRequest';
import { AppError } from '../middleware/errorHandler';
import {
  createDocumentRequestSchema,
  recordDecisionSchema,
  reviewerApplicationQuerySchema,
  updateReviewerNotesSchema,
} from '../validators/reviewerValidators';
import {
  createDocumentRequest,
  getReviewerApplication,
  getReviewerDashboardStats,
  listReviewerApplications,
  recordReviewDecision,
  updateReviewerNotes,
} from '../services/reviewerService';

const router = Router();

router.use(requireAuth, requireRoles(UserRole.REVIEWER, UserRole.ADMIN));

router.get('/dashboard', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const dashboard = await getReviewerDashboardStats(req.user);
    res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    next(error);
  }
});

router.get('/applications', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const query = reviewerApplicationQuerySchema.parse({
      status: typeof req.query.status === 'string' ? req.query.status : undefined,
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
    });

    const applications = await listReviewerApplications(req.user, query);
    res.status(200).json({ success: true, data: { applications } });
  } catch (error) {
    next(error);
  }
});

router.get('/applications/:id', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const application = await getReviewerApplication(req.user, String(req.params.id));
    res.status(200).json({ success: true, data: { application } });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/applications/:id/notes',
  validateBody(updateReviewerNotesSchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const application = await updateReviewerNotes(
        req.user,
        String(req.params.id),
        req.body,
      );
      res.status(200).json({ success: true, data: { application } });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/applications/:id/decisions',
  validateBody(recordDecisionSchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const result = await recordReviewDecision(req.user, String(req.params.id), req.body);
      res.status(201).json({
        success: true,
        data: {
          reviewAction: result.reviewAction,
          application: result.application,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  '/applications/:id/requests',
  validateBody(createDocumentRequestSchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const result = await createDocumentRequest(req.user, String(req.params.id), req.body);
      res.status(201).json({
        success: true,
        data: {
          request: result.request,
          application: result.application,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
