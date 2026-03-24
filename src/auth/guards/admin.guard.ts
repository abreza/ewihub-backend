import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../user/schemas/user.schema';

export const SKIP_ADMIN_GUARD_KEY = 'skipAdminGuard';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const skipAdminGuard = this.reflector.getAllAndOverride<boolean>(
      SKIP_ADMIN_GUARD_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipAdminGuard) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== UserRole.SuperAdmin) {
      throw new ForbiddenException('Only admin users can access this section');
    }

    return true;
  }
}
