import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import merchantRoutes from './routes/merchant.js';
import adminRoutes from './routes/admin.js';
import hotelsRoutes from './routes/hotels.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hotels', hotelsRoutes);

app.use(errorHandler);

export default app;
