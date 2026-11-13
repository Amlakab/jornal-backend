"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = require("mongoose");
const FilterPreset_js_1 = require("../models/FilterPreset.js");
const auth_js_1 = require("../middleware/auth.js");
const presetValidator_js_1 = require("../validators/presetValidator.js");
const router = (0, express_1.Router)();
router.use(auth_js_1.requireAuth, auth_js_1.scopeUser);
// GET /api/presets
router.get('/', async (req, res) => {
    try {
        const userId = req.scopedUserId;
        const presets = await FilterPreset_js_1.FilterPreset.find({ userId }).sort({ createdAt: -1 });
        res.json({ success: true, data: presets });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch filter presets', error: error.message });
    }
});
// POST /api/presets
router.post('/', async (req, res) => {
    try {
        const userId = req.scopedUserId;
        if (!userId) {
            res.status(400).json({ success: false, message: 'User context required' });
            return;
        }
        const parseResult = presetValidator_js_1.createPresetSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
            return;
        }
        const { name, filters } = parseResult.data;
        // Check if duplicate name for user
        const existing = await FilterPreset_js_1.FilterPreset.findOne({ userId, name });
        if (existing) {
            existing.filters = filters;
            await existing.save();
            res.json({ success: true, data: existing, message: 'Preset updated with new filters' });
            return;
        }
        const preset = new FilterPreset_js_1.FilterPreset({
            userId,
            name,
            filters,
        });
        await preset.save();
        res.status(201).json({ success: true, data: preset });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to create preset', error: error.message });
    }
});
// PATCH /api/presets/:id
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.scopedUserId;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid preset ID' });
            return;
        }
        const parseResult = presetValidator_js_1.updatePresetSchema.safeParse(req.body);
        if (!parseResult.success) {
            res.status(400).json({ success: false, errors: parseResult.error.flatten().fieldErrors });
            return;
        }
        const preset = await FilterPreset_js_1.FilterPreset.findOne({ _id: id, userId });
        if (!preset) {
            res.status(404).json({ success: false, message: 'Preset not found' });
            return;
        }
        const { name, filters } = parseResult.data;
        if (name)
            preset.name = name;
        if (filters)
            preset.filters = filters;
        await preset.save();
        res.json({ success: true, data: preset });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update preset', error: error.message });
    }
});
// DELETE /api/presets/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.scopedUserId;
        if (!mongoose_1.Types.ObjectId.isValid(id)) {
            res.status(400).json({ success: false, message: 'Invalid preset ID' });
            return;
        }
        const preset = await FilterPreset_js_1.FilterPreset.findOneAndDelete({ _id: id, userId });
        if (!preset) {
            res.status(404).json({ success: false, message: 'Preset not found' });
            return;
        }
        res.json({ success: true, message: 'Preset deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete preset', error: error.message });
    }
});
exports.default = router;
