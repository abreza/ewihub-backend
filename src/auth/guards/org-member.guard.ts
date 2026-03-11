import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './jwt-auth.guard';
import { UserRole } from '../../user/schemas/user.schema';

@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.role === UserRole.SuperAdmin) {
      request.organizationFilter = null;
      return true;
    }

    if (!user.organizationId) {
      throw new ForbiddenException(
        'Your account is not linked to any organization',
      );
    }

    request.organizationFilter = user.organizationId;
    return true;
  }
}
