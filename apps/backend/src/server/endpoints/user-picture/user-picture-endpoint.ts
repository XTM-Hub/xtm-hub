import cors from 'cors';
import { Express, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { Readable } from 'stream';
import { UserDomain } from '../../../modules/organization-management/user/user-domain/user.domain';
import { MinIOClient } from '../../../thirdparty/minio/client';
import { logApp } from '../../../utils/app-logger.util';
import {
  setStoredFileSecurityHeaders,
  toStoredImageContentType,
} from '../shared/stored-file.util';

const USER_PICTURE_RATE_WINDOW_MS = 60 * 1000;
const USER_PICTURE_RATE_MAX = 300;
// One week, and not immutable: the frontend image optimiser fetches the picture by its path alone, whose
// content changes when the user uploads a new one. The optimiser keeps its resized copy for this long, and
// sends the full lifetime (not the time left) with every response, even a stale one it then revalidates:
// a replaced picture can stay visible in the views that use the optimiser for about twice this, two weeks.
const USER_PICTURE_CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const userPictureRateLimiter = rateLimit({
  windowMs: USER_PICTURE_RATE_WINDOW_MS,
  max: USER_PICTURE_RATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

export const getUserPicture = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const pictureMinio = await UserDomain.loadUserPictureMinio(
      req.params.userId as string
    );

    if (!pictureMinio) {
      res.status(404).json({ message: 'No picture found' });
      return;
    }

    const file = await MinIOClient.downloadFileWithMimeType(pictureMinio);

    if (!file) {
      res.status(404).json({ message: 'Picture not found' });
      return;
    }

    const stream = file.body as Readable;

    res.setHeader('Content-Type', toStoredImageContentType(file.mimeType));
    res.setHeader(
      'Cache-Control',
      `public, max-age=${USER_PICTURE_CACHE_MAX_AGE_SECONDS}`
    );
    setStoredFileSecurityHeaders(res);

    stream.on('error', (error) => {
      logApp.error('Error while streaming user picture', { error });
      if (res.headersSent) {
        res.destroy(error);
      } else {
        res.removeHeader('Cache-Control');
        res.removeHeader('Content-Type');
        res.status(404).json({ message: 'Picture not found' });
      }
    });

    stream.pipe(res);
  } catch (error) {
    logApp.error('Error while retrieving user picture', { error });
    if (res.headersSent) {
      res.destroy(error as Error);
      return;
    }
    res.removeHeader('Cache-Control');
    res.removeHeader('Content-Type');
    res.status(404).json({ message: 'Picture not found' });
  }
};

export const userPictureEndpoint = (app: Express) => {
  app.get(
    '/user/picture/:userId',
    userPictureRateLimiter,
    cors(),
    getUserPicture
  );
};
