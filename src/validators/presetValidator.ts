import { z } from 'zod';

export const createPresetSchema = z.object({
  name: z.string().min(1, 'Preset name is required'),
  filters: z.record(z.any()).default({}),
});

export const updatePresetSchema = z.object({
  name: z.string().min(1).optional(),
  filters: z.record(z.any()).optional(),
});
