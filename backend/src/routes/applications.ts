import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { requireAuth, requireRoles } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateRequest';
import { uploadDocument } from '../middleware/uploadMiddleware';
import { AppError } from '../middleware/errorHandler';
import {
  createApplicationSchema,
  updateApplicationSchema,
  uploadDocumentFieldsSchema,
} from '../validators/applicationValidators';
import {
  createApplication,
  getApplicationById,
  listApplicationRequests,
  listApplications,
  submitApplication,
  updateApplicationNotes,
} from '../services/applicationService';
import { uploadApplicationDocument } from '../services/documentService';

const router = Router();

router.use(requireAuth);

router.post(
  '/',
  requireRoles(UserRole.APPLICANT, UserRole.ADMIN),
  validateBody(createApplicationSchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const application = await createApplication(req.user, req.body);
      res.status(201).json({ success: true, data: { application } });
    } catch (error) {
      next(error);
    }
  },
);

router.get('/', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const applications = await listApplications(req.user);
    res.status(200).json({ success: true, data: { applications } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const application = await getApplicationById(req.user, String(req.params.id));
    res.status(200).json({ success: true, data: { application } });
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/:id',
  requireRoles(UserRole.APPLICANT, UserRole.ADMIN),
  validateBody(updateApplicationSchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const application = await updateApplicationNotes(
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
  '/:id/submit',
  requireRoles(UserRole.APPLICANT, UserRole.ADMIN),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const application = await submitApplication(req.user, String(req.params.id));
      res.status(200).json({ success: true, data: { application } });
    } catch (error) {
      next(error);
    }
  },
);

router.post('/:id/documents', requireRoles(UserRole.APPLICANT, UserRole.ADMIN), (req, res, next) => {
  uploadDocument(req, res, (uploadError) => {
    void (async () => {
      try {
        if (uploadError) {
          if (uploadError instanceof AppError) {
            throw uploadError;
          }

          const message =
            uploadError instanceof Error ? uploadError.message : 'File upload failed';

          if (message.toLowerCase().includes('file too large')) {
            throw new AppError('File exceeds the maximum allowed size of 10 MB', 400);
          }

          throw new AppError(message, 400);
        }

        if (!req.user) {
          throw new AppError('Authentication required', 401);
        }

        const fields = uploadDocumentFieldsSchema.parse({
          documentTypeId: req.body.documentTypeId,
          replaceDocumentId: req.body.replaceDocumentId || undefined,
        });

        const document = await uploadApplicationDocument(
          req.user,
          String(req.params.id),
          fields,
          req.file,
        );

        res.status(201).json({ success: true, data: { document } });
      } catch (error) {
        next(error);
      }
    })();
  });
});

router.get('/:id/requests', async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const requests = await listApplicationRequests(req.user, String(req.params.id));
    res.status(200).json({ success: true, data: { requests } });
  } catch (error) {
    next(error);
  }
});

export default router;
