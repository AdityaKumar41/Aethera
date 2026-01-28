import * as dotenv from 'dotenv'
import path from 'path'

// Explicitly load .env as required by Prisma 7
dotenv.config({ path: path.resolve(__dirname, '.env') })

export default {
  datasource: {
    url: process.env.DATABASE_URL
  }
}
