import { z } from 'zod';

export const createOptionSchema = z.object({
  field: z.string().min(1, 'Field name is required'),
  value: z.string().min(1, 'Option value is required'),
  isSystem: z.boolean().optional().default(false),
});

export const createPresetSchema = z.object({
  name: z.string().min(1, 'Preset name is required'),
  filters: z.record(z.any()).default({}),
});

export const updatePresetSchema = z.object({
  name: z.string().min(1).optional(),
  filters: z.record(z.any()).optional(),
});
