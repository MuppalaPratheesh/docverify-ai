import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { requireAuth, requireRoles } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateRequest';
import { changeUserRole } from '../services/authService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const changeRoleSchema = z
  .object({
    role: z.enum([UserRole.APPLICANT, UserRole.REVIEWER, UserRole.ADMIN]),
  })
  .strict();

router.patch(
  '/users/:userId/role',
  requireAuth,
  requireRoles(UserRole.ADMIN),
  validateBody(changeRoleSchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401);
      }

      const userId = String(req.params.userId);
      const user = await changeUserRole(req.user.id, userId, req.body.role);


      res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
