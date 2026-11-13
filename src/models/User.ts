import mongoose, { Document, Schema, Types } from 'mongoose';

export type UserRole = 'admin' | 'trader';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Don't return passwordHash by default
    },
    role: {
      type: String,
      enum: ['admin', 'trader'],
      default: 'trader',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
