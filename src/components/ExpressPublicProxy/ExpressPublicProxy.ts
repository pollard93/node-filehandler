import { Application } from 'express';
import { FileHandler } from '../FileHandler/FileHandler';

/**
 * Create express get route for /public/*
 * Proxies all paths prefixed public
 */
export default (e: Application) => {
  e.get('/public/*', async (req, res) => {
    try {
      const stream = await FileHandler.client.getObject(FileHandler.config.bucketName, req.originalUrl);
      return stream.pipe(res);
    } catch {
      return res.status(404);
    }
  });
};
