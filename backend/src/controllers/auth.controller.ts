import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { ENV } from '../config/env';
import { AuthRequest } from '../middlewares/auth.middleware';
import { getMongoDb, toObjectId } from '../utils/db';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password required' });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { role: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const roleName = user.role?.name || 'WORKER';

      const accessToken = jwt.sign(
        { sub: user.id, email: user.email, role: roleName },
        ENV.JWT_SECRET,
        { expiresIn: ENV.JWT_EXPIRES_IN as any }
      );

      const refreshToken = jwt.sign(
        { sub: user.id, email: user.email, role: roleName },
        ENV.JWT_REFRESH_SECRET,
        { expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any }
      );

      const hashedRefresh = await bcrypt.hash(refreshToken, 10);

      const db = await getMongoDb();
      await db.collection('users').updateOne(
        { _id: toObjectId(user.id) },
        { $set: { refreshToken: hashedRefresh, updatedAt: new Date() } }
      );

      await db.collection('activity_logs').insertOne({
        userId: toObjectId(user.id),
        action: 'USER_LOGIN',
        module: 'AUTH',
        details: `User ${user.email} logged in`,
        createdAt: new Date(),
      });

      return res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: roleName,
          },
          tokens: { accessToken, refreshToken },
        },
      });
    } catch (e: any) {
      console.error('Login Error:', e);
      return res.status(500).json({ success: false, message: e.message || 'Server error' });
    }
  }

  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token required' });
      }

      const payload = jwt.verify(refreshToken, ENV.JWT_REFRESH_SECRET) as any;
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true },
      });

      if (!user || !user.refreshToken) {
        return res.status(401).json({ success: false, message: 'Access Denied' });
      }

      const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid refresh token' });
      }

      const roleName = user.role?.name || 'WORKER';

      const newAccessToken = jwt.sign(
        { sub: user.id, email: user.email, role: roleName },
        ENV.JWT_SECRET,
        { expiresIn: ENV.JWT_EXPIRES_IN as any }
      );

      const newRefreshToken = jwt.sign(
        { sub: user.id, email: user.email, role: roleName },
        ENV.JWT_REFRESH_SECRET,
        { expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any }
      );

      const hashedRefresh = await bcrypt.hash(newRefreshToken, 10);
      const db = await getMongoDb();
      await db.collection('users').updateOne(
        { _id: toObjectId(user.id) },
        { $set: { refreshToken: hashedRefresh, updatedAt: new Date() } }
      );

      return res.json({
        success: true,
        data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
      });
    } catch (e: any) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;
    return res.json({
      success: true,
      data: { message: `If ${email} exists, password reset link has been generated.` },
    });
  }

  static async resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;
    try {
      const payload = jwt.verify(token, ENV.JWT_SECRET) as any;
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const db = await getMongoDb();
      await db.collection('users').updateOne(
        { _id: toObjectId(payload.sub) },
        { $set: { password: hashedPassword, updatedAt: new Date() } }
      );

      return res.json({ success: true, data: { message: 'Password reset successfully' } });
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
  }

  static async me(req: AuthRequest, res: Response) {
    const u = req.user;
    if (!u) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const fullUser = await prisma.user.findUnique({ where: { id: u.id }, include: { role: true } });
    return res.json({
      success: true,
      data: {
        id: u.id,
        name: fullUser?.name || u.name,
        email: fullUser?.email || u.email,
        phone: fullUser?.phone || u.phone,
        role: fullUser?.role?.name || u.role?.name || 'WORKER',
        notificationSettings: (fullUser as any)?.notificationSettings,
      },
    });
  }

  static async updateProfile(req: AuthRequest, res: Response) {
    try {
      const u = req.user;
      if (!u) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { name, email, phone, password, notificationSettings } = req.body;
      const updateFields: any = { updatedAt: new Date() };

      if (name) updateFields.name = name;
      if (email) updateFields.email = email;
      if (phone !== undefined) updateFields.phone = phone;
      if (password) updateFields.password = await bcrypt.hash(password, 10);
      if (notificationSettings) updateFields.notificationSettings = notificationSettings;

      const db = await getMongoDb();
      await db.collection('users').updateOne(
        { _id: toObjectId(u.id) },
        { $set: updateFields }
      );

      const updated = await prisma.user.findUnique({
        where: { id: u.id },
        include: { role: true },
      });

      return res.json({
        success: true,
        data: {
          id: updated?.id,
          name: updated?.name,
          email: updated?.email,
          phone: updated?.phone,
          role: updated?.role?.name || 'WORKER',
          notificationSettings: (updated as any)?.notificationSettings,
        },
      });
    } catch (e: any) {
      console.error('Update Profile Error:', e);
      return res.status(500).json({ success: false, message: e.message || 'Failed to update profile' });
    }
  }
}
