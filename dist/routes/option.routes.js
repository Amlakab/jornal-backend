"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = require("mongoose");
const DropdownOption_js_1 = require("../models/DropdownOption.js");
const auth_js_1 = require("../middleware/auth.js");
const optionValidator_js_1 = require("../validators/optionValidator.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth);
// GET /api/options?field=pair
router.get('/', async (req, res) => {
    try {
        const { field } = req.query;
        const userId = req.user?._id;
        const query = {
            $or: [
                { isSystem: true },
                { userId: userId },
            ],
        };
        if (field && typeof field === 'string') {
            query.field = field;
        }
        const options = await DropdownOption_js_1.DropdownOption.find(query).sort({ field: 1, value: 1 });
        res.json({ success: true, data: options });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch options', error: error.message });
    }
});
// POST /api/options
router.post('/', async (req, res) => {
    try {
        const parseResult = optionValidator_js_1.createOptionSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
            return;
        }
        const { field, value, isSystem } = parseResult.data;
        const userId = req.user?._id;
        const isAdmin = req.user?.role === 'admin';
        const systemFlag = isAdmin && isSystem === true;
        // Check if option already exists
        const existing = await DropdownOption_js_1.DropdownOption.findOne({
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
        const newOption = new DropdownOption_js_1.DropdownOption({
            userId: systemFlag ? undefined : userId,
            field: field.trim(),
            value: value.trim(),
            isSystem: systemFlag,
        });
        await newOption.save();
        res.status(201).json({ success: true, data: newOption });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create option', error: error.message });
    }
});
// DELETE /api/options/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid option ID' });
            return;
        }
        const option = await DropdownOption_js_1.DropdownOption.findById(id);
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
        await DropdownOption_js_1.DropdownOption.findByIdAndDelete(id);
        res.json({ success: true, message: 'Option deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete option', error: error.message });
    }
});
exports.default = router;
