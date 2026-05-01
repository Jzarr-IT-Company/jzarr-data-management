import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

import { env } from '../config/loadEnv.js'
import { AppError } from '../utils/app-error.js'
import { HTTP_STATUS } from '../constant/index.js'

let spacesClient: S3Client | null = null

function requireSpacesConfig() {
  const missing = [
    ['AWS_ACCESS_KEY_ID', env.AWS_ACCESS_KEY_ID],
    ['AWS_SECRET_ACCESS_KEY', env.AWS_SECRET_ACCESS_KEY],
    ['AWS_S3_BUCKET_NAME', env.AWS_S3_BUCKET_NAME],
    ['AWS_S3_REGION', env.AWS_S3_REGION],
    ['AWS_S3_ENDPOINT', env.AWS_S3_ENDPOINT],
  ].filter(([, value]) => !value)

  if (missing.length) {
    throw new AppError(
      `DigitalOcean Spaces is not configured: ${missing.map(([key]) => key).join(', ')}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
    )
  }

  return {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    bucketName: env.AWS_S3_BUCKET_NAME!,
    region: env.AWS_S3_REGION!,
    endpoint: env.AWS_S3_ENDPOINT!,
    domain: env.AWS_S3_DOMAIN,
  }
}

function getSpacesClient() {
  if (spacesClient) {
    return spacesClient
  }

  const config = requireSpacesConfig()

  spacesClient = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  return spacesClient
}

function sanitizePathPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'file'
}

export async function uploadStoreFileToSpaces(
  storeId: string,
  category: string,
  file: Express.Multer.File,
) {
  const config = requireSpacesConfig()
  const extension = extname(file.originalname)
  const key = [
    'stores',
    sanitizePathPart(storeId),
    sanitizePathPart(category),
    `${Date.now()}-${randomUUID()}${extension}`,
  ].join('/')

  await getSpacesClient().send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    }),
  )

  const publicBaseUrl = config.domain
    ? `https://${config.domain.replace(/^https?:\/\//, '')}`
    : `${config.endpoint.replace(/\/$/, '')}/${config.bucketName}`

  return {
    key,
    url: `${publicBaseUrl}/${key}`,
  }
}
