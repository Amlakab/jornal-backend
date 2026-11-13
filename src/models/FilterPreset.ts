import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IFilterPreset extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  filters: Record<string, any>;
  createdAt: Date;
}

const FilterPresetSchema = new Schema<IFilterPreset>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    filters: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

FilterPresetSchema.index({ userId: 1, name: 1 }, { unique: true });

export const FilterPreset = mongoose.model<IFilterPreset>('FilterPreset', FilterPresetSchema);
