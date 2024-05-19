import multer, { FileFilterCallback } from 'multer'
import AWS from 'aws-sdk'
import archiver from 'archiver'
import cors from 'cors'
import express, { Request } from 'express'
import { env } from './utils/env'

import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'

const app = express()

app.listen(env.PORT, () => {
  console.log(`🚀 server listening on port: ${env.PORT} 🚀`)
})
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

const s3 = new AWS.S3({
  accessKeyId: env.AWS_KEY,
  secretAccessKey: env.AWS_SECRET_KEY,
})

const storage = multer.memoryStorage()

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback,
) => {
  const acceptExtension = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'image/svg+xml',
  ].includes(file.mimetype)

  if (acceptExtension) {
    return cb(null, true)
  }
  return cb(null, false)
}

const upload = multer({ storage, fileFilter })

app.post('/upload', upload.array('files', 100), async (req, res) => {
  if (!req.files) {
    return res.status(400).send({ message: 'Invalid file type' })
  }
  if (req.files.length === 0) {
    return res.status(400).send({ message: 'Invalid type files' })
  }

  try {
    const promises = req.files.map(async (file: Express.Multer.File) => {
      const params = {
        Bucket: env.AWS_BUCKET_NAME,
        Key: file.originalname.replace(' ', '_').replace('-', '_'),

        Body: file.buffer,
      }
      const result = await s3.upload(params).promise()
      return { ...result, Size: file.size, LastModified: new Date() }
    })
    const newResult = await Promise.all(promises)

    return res
      .status(200)
      .json({ message: 'Upload successful', files: newResult })
  } catch (error) {
    return res.status(500).json({ message: 'Error uploading files to S3' })
  }
})

async function listAllObjects(bucket: string): Promise<AWS.S3.ObjectList> {
  let allContents: AWS.S3.ObjectList = []
  let continuationToken: string | undefined = undefined

  do {
    const params: AWS.S3.ListObjectsV2Request = {
      Bucket: bucket,
      ContinuationToken: continuationToken,
    }

    const data = await s3.listObjectsV2(params).promise()
    allContents = allContents.concat(data.Contents || [])
    continuationToken = data.NextContinuationToken
  } while (continuationToken)

  return allContents
}

app.get('/files', async (req, res) => {
  const page = parseInt(req.query.page as string) ?? 1
  const pageSize = parseInt(req.query.pageSize as string) ?? 10

  if (isNaN(page) || isNaN(pageSize) || page < 1 || pageSize < 1) {
    return res.status(400).json({ message: 'Invalid page number or page size' })
  }

  try {
    const bucketName = env.AWS_BUCKET_NAME
    const allContents = await listAllObjects(bucketName)

    const sortedContents = allContents.sort((a: any, b: any) => {
      return (
        new Date(b.LastModified).getTime() - new Date(a.LastModified).getTime()
      )
    })

    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const pageContents = sortedContents.slice(startIndex, endIndex)

    if (pageContents.length === 0) {
      return res
        .status(404)
        .json({ message: 'No files found for the requested page' })
    }

    return res.status(200).json({
      page,
      pageSize,
      totalFiles: allContents.length,
      files: pageContents,
    })
  } catch (error) {
    console.error('Error listing files from S3:', error)
    return res.status(500).json({ message: 'Error listing files from S3' })
  }
})

const tempDir = path.resolve(__dirname, 'tmp')
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir)
}

app.get('/file/:key', async (req, res) => {
  const { key } = req.params
  const { typeFile } = req.query

  if (!typeFile) {
    return res.status(400).json({ message: 'Invalid type file' })
  }
  if (!key) {
    return res.status(404).json({ message: 'Invalid key' })
  }

  const params = {
    Bucket: env.AWS_BUCKET_NAME,
    Key: key,
  }

  try {
    const data = await s3.getObject(params).promise()

    const localFilePath = path.join(tempDir, key)
    if (!data.Body) {
      return res.status(400).json({ message: 'file not found' })
    }
    fs.writeFileSync(localFilePath, data.Body)

    if (typeFile === 'pdf') {
      const pdfData = fs.createReadStream(localFilePath)
      res.setHeader('Content-Type', 'application/pdf')
      pdfData.pipe(res)
      setTimeout(async () => {
        await fs.promises.unlink(localFilePath)
      }, 2000)
    } else {
      exec(
        `soffice --headless --convert-to pdf --outdir ${tempDir} ${localFilePath}`,
        async (error, stdout, stderr) => {
          if (error) {
            res.status(500).send('Error converting the file.')
            return
          }

          try {
            const pdfFilePath = path.join(
              tempDir,
              `${key.split('.').slice(0, -1).join('.')}.pdf`,
            )
            const pdfData = fs.createReadStream(pdfFilePath)

            res.setHeader('Content-Type', 'application/pdf')
            pdfData.pipe(res)

            await fs.promises.unlink(localFilePath)
            await fs.promises.unlink(pdfFilePath)
          } catch (err) {
            res.status(500).json({ message: 'Error sending the PDF file.' })
          }
        },
      )
    }
  } catch (error) {
    res.status(500).json({ message: 'Error downloading the file from S3.' })
  }
})

app.get('/download/:fileName', async (req, res) => {
  const fileName = req.params.fileName

  try {
    const params = {
      Bucket: env.AWS_BUCKET_NAME,
      Key: fileName,
    }

    const url = await s3.getSignedUrlPromise('getObject', params)
    return res.status(200).json({ downloadFile: url })
  } catch (error) {
    return res.status(500).json({ message: 'Error downloading file from S3' })
  }
})

app.get('/download-all', async (req, res) => {
  const pageNumber: number = parseInt(req.query.page as string)
  const pageSize: number = parseInt(req.query.pageSize as string)

  if (isNaN(pageNumber) || isNaN(pageSize) || pageNumber < 1 || pageSize < 1) {
    return res.status(400).json({ message: 'Invalid page number or page size' })
  }
  try {
    const params: AWS.S3.ListObjectsV2Request = {
      Bucket: env.AWS_BUCKET_NAME,
      MaxKeys: pageSize,
    }

    const zip = archiver('zip', {
      zlib: { level: 9 },
    })

    res.attachment('files.zip')
    zip.pipe(res)

    let continuationToken
    let currentPage = 0
    do {
      const data: AWS.S3.ListObjectsV2Output = await s3
        .listObjectsV2({ ...params, ContinuationToken: continuationToken })
        .promise()

      if (++currentPage === pageNumber && data.Contents) {
        for (const file of data.Contents) {
          const params = {
            Bucket: env.AWS_BUCKET_NAME,
            Key: file.Key,
          }
          const fileStream = s3.getObject(params).createReadStream()
          zip.append(fileStream, { name: file.Key })
        }
        break
      }
      continuationToken = data.NextContinuationToken
    } while (continuationToken)

    zip.finalize()
  } catch (error) {
    return res.status(500).json({ message: 'Error downloading files from S3' })
  }
})
