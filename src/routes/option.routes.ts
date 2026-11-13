import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { DropdownOption } from '../models/DropdownOption.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { createOptionSchema } from '../validators/optionValidator.js';

const router = Router();

router.use(requireAuth);

// GET /api/options?field=pair
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { field } = req.query;
    const userId = req.user?._id;

    const query: Record<string, any> = {
      $or: [
        { isSystem: true },
        { userId: userId },
      ],
    };

    if (field && typeof field === 'string') {
      query.field = field;
    }

    const options = await DropdownOption.find(query).sort({ field: 1, value: 1 });

    res.json({ success: true, data: options });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch options', error: error.message });
  }
});

// POST /api/options
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const parseResult = createOptionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
      return;
    }

    const { field, value, isSystem } = parseResult.data;
    const userId = req.user?._id;
    const isAdmin = req.user?.role === 'admin';

    const systemFlag = isAdmin && isSystem === true;

    // Check if option already exists
    const existing = await DropdownOption.findOne({
      field,
      value: { $regex: new RegExp(`^${value.trim()}$`, 'i') },
      $or: [
        { isSystem: true },
        { userId },
      ],
    });

    if (existing) {
      res.json({ success: true, data: existing, message: 'Option already exists' });
      return;
    }

    const newOption = new DropdownOption({
      userId: systemFlag ? undefined : userId,
      field: field.trim(),
      value: value.trim(),
      isSystem: systemFlag,
    });

    await newOption.save();

    res.status(201).json({ success: true, data: newOption });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create option', error: error.message });
  }
});

// DELETE /api/options/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid option ID' });
      return;
    }

    const option = await DropdownOption.findById(id);
    if (!option) {
      res.status(404).json({ success: false, message: 'Option not found' });
      return;
    }

    const isAdmin = req.user?.role === 'admin';
    const isOwner = option.userId?.toString() === req.user?._id.toString();

    if (option.isSystem && !isAdmin) {
      res.status(403).json({ success: false, message: 'Only administrators can delete system options' });
      return;
    }

    if (!option.isSystem && !isOwner && !isAdmin) {
      res.status(403).json({ success: false, message: 'Unauthorized to delete this option' });
      return;
    }

    await DropdownOption.findByIdAndDelete(id);

    res.json({ success: true, message: 'Option deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete option', error: error.message });
  }
});

export default router;
