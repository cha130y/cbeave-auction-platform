import { z } from 'zod';

export const uuidV4Schema = z.uuid({ version: 'v4' });
export const dateTimeSchema = z.iso.datetime();
export const moneyResponseSchema = z.string().regex(/^\d+\.\d{2}$/);
export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);
