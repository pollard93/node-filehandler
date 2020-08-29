import { Application } from 'express';
import { FileHandlerInstance } from '../FileHandler/FileHandler';

/**
 * Create express get route for /public/*
 * Proxies all paths prefixed public
 */
export default (e: Application) => {
  e.get('/public/*', async (req, res) => {
    try {
      const stream = await FileHandlerInstance.client.getObject(FileHandlerInstance.config.bucketName, req.path.substr(1));
      return stream.pipe(res);
    } catch {
      return res.status(404);
    }
  });
};
