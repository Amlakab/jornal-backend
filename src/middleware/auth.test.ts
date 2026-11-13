import { describe, it, expect, vi } from 'vitest';
import { Types } from 'mongoose';
import { scopeUser, AuthenticatedRequest } from './auth.js';

describe('scopeUser Middleware', () => {
  it('enforces authenticated userId for trader and strips client-supplied userId', () => {
    const traderId = new Types.ObjectId();
    const spoofedId = new Types.ObjectId();

    const req = {
      user: {
        _id: traderId,
        role: 'trader',
      },
      body: {
        userId: spoofedId.toString(),
        pair: 'EUR/USD',
      },
      query: {
        userId: spoofedId.toString(),
      },
      params: {},
    } as unknown as AuthenticatedRequest;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;

    const next = vi.fn();

    scopeUser(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.scopedUserId).toEqual(traderId);
    expect(req.body.userId).toEqual(traderId);
    expect(req.query.userId).toEqual(traderId.toString());
  });

  it('allows admin to query target trader when id is supplied', () => {
    const adminId = new Types.ObjectId();
    const targetTraderId = new Types.ObjectId();

    const req = {
      user: {
        _id: adminId,
        role: 'admin',
      },
      params: {
        id: targetTraderId.toString(),
      },
      body: {},
      query: {},
    } as unknown as AuthenticatedRequest;

    const res = {} as any;
    const next = vi.fn();

    scopeUser(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.scopedUserId).toEqual(targetTraderId);
  });

  it('sets scopedUserId to undefined for admin when no target is provided (system-wide)', () => {
    const adminId = new Types.ObjectId();

    const req = {
      user: {
        _id: adminId,
        role: 'admin',
      },
      params: {},
      body: {},
      query: {},
    } as unknown as AuthenticatedRequest;

    const res = {} as any;
    const next = vi.fn();

    scopeUser(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.scopedUserId).toBeUndefined();
  });
});
