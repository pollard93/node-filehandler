# Made by Prism Components Node File Handler

## Scripts

1. Install modules - `yarn`

2. Run unit tests - `yarn test:unit`

3. Run lint tests - `yarn test:lint`

4. Bundle with - `yarn build`

5. Install via git `yarn add ssh://git@bitbucket.org:madebyprism/mbp-components-node-filehandler.git#{{branch/tag}}`

## Usage

### Import and initiate the class

```js
import { FileHandlerInstance, FileHandler } from 'mbp-components-node-filehandler';
import Jimp from 'jimp';

/**
 * Type Filehandler with thumbnails by making a reference
 * Import this variable to use typed reference to singleton class
 */
export const FileHandler = FileHandlerInstance as FileHandler<'splash' | 'small' | 'large'>;

/**
 * Init Typed FileHandler
 * This should be run first of all
 */
export const InitFileHandler = () => {
  FileHandler.init({
    siteUrl: `${process.env.API_ENDPOINT}${process.env.API_PORT ? `:${process.env.API_PORT}` : ''}`,
    minioOptions: {
      endPoint: process.env.MINIO_ENDPOINT,
      port: +process.env.MINIO_PORT,
      useSSL: process.env.MINIO_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
      region: process.env.MINIO_REGION,
    },
    bucketName: process.env.MINIO_BUCKET || `bucket-${process.env.NODE_ENV}`,
    thumbnails: {
      splash: (image) => image.resize(10, Jimp.AUTO).blur(1),
      small: (image) => image.resize(100, Jimp.AUTO),
      large: (image) => image.resize(500, Jimp.AUTO),
    },
  });
};
```

### FileHandler can now be used as a proxy for minio

```js
await FileHandler.client.putObject();
```

### For uploading images use: (see function for docs)

```js
await FileHandler.putImage();
```

### To get a url use: (see function for docs)

```js
await FileHandler.getUrl();
```

### To handle graphql uploads:

```js
// Validate image
const { resolved, rejected } = await FileHandler.validateGraphQLUploads([upload as any], {
  mimes: ['image/jpeg'],
  maxFileSize: 5000000,
});

if (Object.keys(rejected).length) {
  throw Error();
}

const uploadResolved = resolved[0];
const url = await FileHandler.putImage(`public/image${path.extname(uploadResolved.filename)}`, uploadResolved.buffer);
```

### To proxy s3 using express include this after initialising express: (see function for docs)

```js
ExpressPublicProxy(express);
```