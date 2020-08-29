import * as Minio from 'minio';
import * as Jimp from 'jimp';

/**
 * Define the functions to process image thumbails
 * Jimp instance give, allows the processing off and then it must be returned for storing
 * Return null to not process
 */
export type ThumbnailOptions<ImageThumbnails extends string> = {
  [K in ImageThumbnails]: (image: Jimp) => Jimp;
};

export interface UploadValidationOptions {
  mimes: string[];
  maxFileSize: number;
}

export interface FileHandlerOptions<ImageThumbnails extends string> {
  siteUrl: string;
  minioOptions: Minio.ClientOptions;
  bucketName: string;
  thumbnails: ThumbnailOptions<ImageThumbnails>;
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

export interface UrlOptions<ImageThumbnails> {
  path: string; // minio key
  thumbnail?: ImageThumbnails; // name of thumbnail
  presignedExpiry?: number; // Presigned url expiry in seconds (defaults to 1 day)
  publicCacheBuster?: boolean; // Appends a unique query string producing a unique url of a public asset
}
