import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { prisma } from '../prisma/client';
import { SystemRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication token required' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, ENV.JWT_SECRET) as any;

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'User is inactive or not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired access token' });
  }
};

export const authorizeRoles = (...roles: SystemRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, message: 'Access denied: User role undefined' });
    }

    const userRole = req.user.role.name as SystemRole;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Requires one of roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};
