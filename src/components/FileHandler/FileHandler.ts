/* eslint-disable class-methods-use-this */
import * as Minio from 'minio';
import * as Jimp from 'jimp';
import * as imagemin from 'imagemin';
import * as imageminJpegtran from 'imagemin-jpegtran';
import imageminPngquant from 'imagemin-pngquant';
import { FileHandlerOptions, GrahpQLUpload, ValidateUploadsResponse, GraphQLStream, UploadValidationOptions, UrlOptions } from './interfaces';

class FileHandler {
  config: FileHandlerOptions;

  client: Minio.Client;

  /**
   * Initialise with config
   * Creates minio client
   */
  init(config: FileHandlerOptions) {
    this.config = config;
    this.client = new Minio.Client(this.config.minioOptions);
  }

  /**
   * Gets url from a path
   * If the path is public, returns a public url
   * If the path is private, returns a presigned url
   * @param options - see interface for docs
   */
  getUrl(options: UrlOptions) {
    const filePath = options.thumbnail ? this.appendPath(options.path, options.thumbnail) : options.path;

    /**
     * Handle public path
     */
    if (this.isPathPublic(filePath)) {
      return `${this.config.siteUrl}/${filePath}${options.publicCacheBuster ? `?${Date.now()}` : ''}`;
    }

    /**
     * Fallback to presigned
     */
    return this.client.presignedUrl('GET', this.config.bucketName, filePath, options.presignedExpiry || 86400);
  }

  /**
   * Puts image in minio with given path and buffer
   * @param path - where to store in minio
   * @param buffer - the buffer to store
   * @param thumbnails - If true, will loop and process ThumbnailOptions
   */
  async putImage(path: string, buffer: Buffer, thumbnails = true): Promise<{[NAME: string]: string}> {
    // Store full size image
    await this.client.putObject(this.config.bucketName, path, buffer);
    const res = {
      full: path,
    };

    // Create thumnails
    if (thumbnails) {
      for (const thumbnailName of Object.keys(this.config.thumbnails)) {
        const thumbnailPath = this.appendPath(path, thumbnailName.toLocaleLowerCase());
        const thumbnailBuffer = await this.createThumbnailImage(buffer, thumbnailName);
        await this.client.putObject(this.config.bucketName, thumbnailPath, thumbnailBuffer);
        res[thumbnailName.toLocaleLowerCase()] = thumbnailPath;
      }
    }

    return res;
  }

  /**
   * Utility to put object with bucket name
   */
  async putObject(path: string, buffer: Buffer) {
    return this.client.putObject(this.config.bucketName, path, buffer);
  }

  /**
   * Creates thumbnail image using ThumbnailOptions
   * @param buffer - buffer of image to process
   * @param thumbnailName - name of thumbnail - key of ThumbnailOptions
   */
  async createThumbnailImage(buffer: Buffer, thumbnailName: string) {
    // Get clone of jimp image
    const image = await (await Jimp.read(buffer)).clone();
    // Process thumbnail with given function and return buffer
    return this.config.thumbnails[thumbnailName](image).getBufferAsync(image.getMIME());
  }

  /**
   * Remove object and thumbnails
   * @param path - where to store in minio
   * @param thumbnails - If true, will loop and remove all thumbnails options
   */
  async removeObject(path: string, thumbnails = true): Promise<boolean> {
    // Remove full size image
    await this.client.removeObject(this.config.bucketName, path);

    // Remove thumbnails
    if (thumbnails) {
      for (const thumbnailName of Object.keys(this.config.thumbnails)) {
        const thumbnailPath = this.appendPath(path, thumbnailName.toLocaleLowerCase());
        await this.client.removeObject(this.config.bucketName, thumbnailPath);
      }
    }

    return true;
  }

  /**
   * Resolves and validates graphql uploads with given validation
   */
  async validateGraphQLUploads(uploads: GrahpQLUpload[], validation: UploadValidationOptions): Promise<ValidateUploadsResponse> {
    const responses: ValidateUploadsResponse = { resolved: [], rejected: {} };

    for (const upload of uploads) {
      let stream: GraphQLStream;
      try {
        stream = await upload;
        stream.readStream = stream.createReadStream();
        responses.resolved.push(await this.validateGraphQLStream(stream, validation));
      } catch (e) {
        responses.rejected[stream.filename] = e.message;
      }
    }

    return responses;
  }

  /**
   * Validates a grapghl stream with given validation
   */
  async validateGraphQLStream(data: GraphQLStream, validation: UploadValidationOptions): Promise<GraphQLStream> {
    return new Promise((resolve, reject) => {
      try {
        /**
         * Read buffers
         */
        const buffers = [];
        data.readStream.on('data', (buffer) => {
          buffers.push(buffer);
        });

        /**
         * On end of reading buffer
         */
        // eslint-disable-next-line consistent-return
        data.readStream.on('end', async () => {
          try {
            let buffer: Buffer = Buffer.concat(buffers);

            /**
             * Image handling
             */
            if (this.isJimpImage(data.mimetype)) {
              // Compress
              buffer = await imagemin.buffer(buffer, {
                plugins: [
                  imageminJpegtran({ quality: '80' }),
                  imageminPngquant(),
                ],
              });

              /**
               * Validate image file size
               */
              if (buffer.byteLength >= validation.maxFileSize) {
                throw new Error(`File Size Exceeded (maximum ${validation.maxFileSize / 1000000}mb)`);
              }

              /**
               * Validate image mime
               */
              const image = await Jimp.read(buffer);
              if (validation.mimes && !validation.mimes.includes(image.getMIME())) {
                throw new Error(`Unsupported Mime Type (we accept ${validation.mimes.map((m) => m.replace(/^(.*?)\//, '')).join(', ')})`);
              }

              // Return Jimp image so previews can be made later
              data.jimpInstance = image; // eslint-disable-line no-param-reassign
              data.buffer = buffer; // eslint-disable-line no-param-reassign
              return resolve(data);
            }

            /**
             * General file handling
             */

            /**
             * Validate file size
             */
            if (buffer.byteLength >= validation.maxFileSize) {
              throw new Error(`File Size Exceeded (maximum ${validation.maxFileSize / 1000000}mb)`);
            }

            /**
             * Validate file mime
             */
            if (validation.mimes && !validation.mimes.includes(data.mimetype)) {
              throw new Error(`Unsupported Mime Type (we accept ${validation.mimes.map((m) => m.replace(/^(.*?)\//, '')).join(', ')})`);
            }

            // Resolve buffer
            // eslint-disable-next-line no-param-reassign
            data.buffer = buffer;
            return resolve(data);
          } catch (e) {
            reject(e);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * Appends path with given appendix
   * appendix is forced lowercase
   */
  appendPath(path: string, appendix: string) {
    if (!path) return null;
    const newPath = path.split('.');
    newPath.splice(newPath.length - 1, 0, appendix.toLowerCase());
    return newPath.join('.');
  }

  /**
   * If path has a public prefix
   * It is public
   */
  isPathPublic(path: string) {
    return path.startsWith('public/');
  }

  /**
   * Jimp supported mime types
   */
  isJimpImage = (mime: string) => [
    'image/jpeg',
    'image/png',
    'image/bmp',
    'image/tiff',
    'image/gif',
  ].includes(mime);

  /**
   * Utility to check if object exists
   */
  async objectExists(path: string) {
    try {
      await this.client.statObject(this.config.bucketName, path);
      return true;
    } catch (e) {
      return false;
    }
  }
}

/**
 * Create instance and export
 */
const instance = new FileHandler();
export { instance as FileHandler };
