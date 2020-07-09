import { Express } from 'express';
import { FileHandler } from '../FileHandler/FileHandler';

/**
 * Create express get route for /public/*
 * Proxies all paths prefixed public
 */
export default (express: Express) => {
  express.get('/public/*', async (req, res) => {
    try {
      const stream = await FileHandler.client.getObject(FileHandler.config.bucketName, req.originalUrl);
      return stream.pipe(res);
    } catch (e) {
      return res.status(404);
    }
  });
};
