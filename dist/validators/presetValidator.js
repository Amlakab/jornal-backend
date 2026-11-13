"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePresetSchema = exports.createPresetSchema = void 0;
const zod_1 = require("zod");
exports.createPresetSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Preset name is required'),
    filters: zod_1.z.record(zod_1.z.any()).default({}),
});
exports.updatePresetSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    filters: zod_1.z.record(zod_1.z.any()).optional(),
});
