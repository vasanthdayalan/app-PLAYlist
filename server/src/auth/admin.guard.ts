import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';

export const ADMIN_TOKEN_HEADER = 'x-admin-token';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    await this.auth.assertAdmin(request.header(ADMIN_TOKEN_HEADER));
    return true;
  }
}
