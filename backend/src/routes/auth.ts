import { Router } from 'express';
import { clearAuthCookie, setAuthCookie } from '../utils/cookies';
import { requireAuth } from '../middleware/authMiddleware';
import { validateBody } from '../middleware/validateRequest';
import { loginSchema, registerSchema } from '../validators/authValidators';
import {
  getUserById,
  loginUser,
  logoutUser,
  registerApplicant,
} from '../services/authService';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.post('/register', validateBody(registerSchema), async (req, res, next) => {
  try {
    const { user, token } = await registerApplicant(req.body);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', validateBody(loginSchema), async (req, res, next) => {
  try {
    const { user, token } = await loginUser(req.body);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    await logoutUser(req.user.id);
    clearAuthCookie(res);

    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const user = await getUserById(req.user.id);

    if (!user) {
      throw new AppError('Authentication required', 401);
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
