"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePresetSchema = exports.createPresetSchema = exports.createOptionSchema = void 0;
const zod_1 = require("zod");
exports.createOptionSchema = zod_1.z.object({
    field: zod_1.z.string().min(1, 'Field name is required'),
    value: zod_1.z.string().min(1, 'Option value is required'),
    isSystem: zod_1.z.boolean().optional().default(false),
});
exports.createPresetSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Preset name is required'),
    filters: zod_1.z.record(zod_1.z.any()).default({}),
});
exports.updatePresetSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    filters: zod_1.z.record(zod_1.z.any()).optional(),
});
