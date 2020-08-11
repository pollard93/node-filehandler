import * as Minio from 'minio';
import * as Jimp from 'jimp';

export interface ThumbnailOptions {
  [NAME: string]: (image: Jimp) => Jimp;
}

export interface UploadValidationOptions {
  mimes: string[];
  maxFileSize: number;
}

export interface FileHandlerOptions {
  siteUrl: string;
  minioOptions: Minio.ClientOptions;
  bucketName: string;
  thumbnails: ThumbnailOptions;
}

export type GraphQLStream = {
  createReadStream: () => NodeJS.ReadableStream;
  readStream: NodeJS.ReadableStream;
  filename: string;
  mimetype: string;
  encoding: string;
  buffer?: Buffer;
  jimpInstance?: Jimp;
}

export type GrahpQLUpload = Promise<GraphQLStream>;

export interface ValidateUploadsResponse {
  resolved: GraphQLStream[];
  rejected: {[filename: string]: Error[]};
}

export interface UrlOptions {
  path: string; // minio key
  thumbnail?: string; // name of thumbnail
  presignedExpiry?: number; // Presigned url expiry in seconds (defaults to 1 day)
  publicCacheBuster?: boolean; // Appends a unique query string producing a unique url of a public asset
}
