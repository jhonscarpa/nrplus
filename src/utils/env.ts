import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'production', 'test']).default('dev'),
  AWS_KEY: z.string(),
  PORT: z.coerce.number().default(3333),
  AWS_SECRET_KEY: z.string(),
  AWS_BUCKET_NAME: z.string(),
})

const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
  console.error('⚠️ Invalid environment variable', _env.error.format())
  throw new Error('Invalid environment variable')
}

export const env = _env.data
