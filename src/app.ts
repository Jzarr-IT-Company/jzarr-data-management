import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'

import { corsConfig } from './config/cors.js'
import { v1Router } from './api/v1/routes/index.js'
import { apiErrorMiddleware } from './api/v1/middleware/error.middleware.js'
import { notFoundMiddleware } from './api/v1/middleware/notFound.middleware.js'

const app = express()

app.use(helmet())
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsConfig.allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
  })
)
app.use(express.json())
app.use(morgan('dev'))

app.use('/api/v1', v1Router)

app.use(notFoundMiddleware)
app.use(apiErrorMiddleware)

export default app
