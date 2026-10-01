import type { Request } from 'express';
import type { Classroom, ClassMembership } from '../../generated/prisma/client.js';
import type { UserRole } from '../../generated/prisma/enums.js';

export interface AuthenticatedUser {
  id: string | number | bigint;
  email: string;
  role: UserRole;
  fullName?: string;
}

export interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

export interface RequestWithClassContext extends RequestWithUser {
  classroom?: Classroom;
  classMembership?: ClassMembership;
}
