import { Router } from 'express';
import fs from 'node:fs';
import { requireAuth } from '../middleware/authMiddleware';
import { AppError } from '../middleware/errorHandler';
import { getAuthorizedDocumentFile } from '../services/documentService';

const router = Router();

router.get('/:id/download', requireAuth, async (req, res, next) => {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    const { absolutePath, document } = await getAuthorizedDocumentFile(
      req.user,
      String(req.params.id),
    );

    const disposition =
      req.query.disposition === 'inline' || req.query.preview === 'true'
        ? 'inline'
        : 'attachment';

    const safeName = document.originalFilename.replace(/"/g, '');

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    const stream = fs.createReadStream(absolutePath);
    stream.on('error', (error) => next(error));
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});

export default router;
