import dotenv from 'dotenv';
dotenv.config();


export const JWT_SECRET = process.env.JWT_SECRET;
export const PORT = process.env.PORT;
export const MOMO_SUBSCRIPTION_KEY = process.env.MOMO_SUBSCRIPTION_KEY;
export const MOMO_CALLBACK_HOST = process.env.MOMO_CALLBACK_HOST;