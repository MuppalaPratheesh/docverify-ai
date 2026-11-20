import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { listActiveDocumentTypes } from '../services/documentService';

const router = Router();

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    const documentTypes = await listActiveDocumentTypes();
    res.status(200).json({ success: true, data: { documentTypes } });
  } catch (error) {
    next(error);
  }
});

export default router;
