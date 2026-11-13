import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDropdownOption extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  field: string;
  value: string;
  isSystem: boolean;
  createdAt: Date;
}

const DropdownOptionSchema = new Schema<IDropdownOption>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    field: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    isSystem: {
      type: Boolean,
      default: false,
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

DropdownOptionSchema.index({ userId: 1, field: 1, value: 1 }, { unique: true });

export const DropdownOption = mongoose.model<IDropdownOption>('DropdownOption', DropdownOptionSchema);
