import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { FilterPreset } from '../models/FilterPreset.js';
import { requireAuth, scopeUser, AuthenticatedRequest } from '../middleware/auth.js';
import { createPresetSchema, updatePresetSchema } from '../validators/presetValidator.js';

const router = Router();

router.use(requireAuth, scopeUser);

// GET /api/presets
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.scopedUserId;
    const presets = await FilterPreset.find({ userId }).sort({ createdAt: -1 });

    res.json({ success: true, data: presets });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch filter presets', error: error.message });
  }
});

// POST /api/presets
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.scopedUserId;
    if (!userId) {
      res.status(400).json({ success: false, message: 'User context required' });
      return;
    }

    const parseResult = createPresetSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { name, filters } = parseResult.data;

    // Check if duplicate name for user
    const existing = await FilterPreset.findOne({ userId, name });
    if (existing) {
      existing.filters = filters;
      await existing.save();
      res.json({ success: true, data: existing, message: 'Preset updated with new filters' });
      return;
    }

    const preset = new FilterPreset({
      userId,
      name,
      filters,
    });

    await preset.save();

    res.status(201).json({ success: true, data: preset });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create preset', error: error.message });
  }
});

// PATCH /api/presets/:id
router.patch('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.scopedUserId;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid preset ID' });
      return;
    }

    const parseResult = updatePresetSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const preset = await FilterPreset.findOne({ _id: id, userId });
    if (!preset) {
      res.status(404).json({ success: false, message: 'Preset not found' });
      return;
    }

    const { name, filters } = parseResult.data;
    if (name) preset.name = name;
    if (filters) preset.filters = filters;

    await preset.save();

    res.json({ success: true, data: preset });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update preset', error: error.message });
  }
});

// DELETE /api/presets/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.scopedUserId;

    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid preset ID' });
      return;
    }

    const preset = await FilterPreset.findOneAndDelete({ _id: id, userId });
    if (!preset) {
      res.status(404).json({ success: false, message: 'Preset not found' });
      return;
    }

    res.json({ success: true, message: 'Preset deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete preset', error: error.message });
  }
});

export default router;
