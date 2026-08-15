import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerJsDoc from 'swagger-jsdoc';
import routes from './routes';
import { errorHandler } from './middlewares/error.middleware';
import { ENV } from './config/env';

const app = express();

// Allowed CORS origins
const allowedOrigins = [
  'https://shankar-seed.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001',
  ENV.CORS_ORIGIN,
].filter(Boolean);

// CORS Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, cURL, server-to-server)
      if (!origin) return callback(null, true);
      if (
        ENV.CORS_ORIGIN === '*' ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, origin);
      }
      return callback(null, origin);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploads statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Swagger API Documentation Setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shankar Seeds ERP Node.js API',
      version: '1.0.0',
      description: 'Commercial Seed Trading Business REST API',
    },
    servers: [{ url: `http://localhost:${ENV.PORT}/api` }],
  },
  apis: ['./src/routes/*.ts'],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Mount REST API Routes
app.use('/api', routes);

// Global Error Handler
app.use(errorHandler);

export default app;

