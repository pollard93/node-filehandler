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
