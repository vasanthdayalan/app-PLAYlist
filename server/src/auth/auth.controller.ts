import { Body, Controller, Get, Headers, Put, UseGuards } from '@nestjs/common';
import { ADMIN_TOKEN_HEADER, AdminGuard } from './admin.guard.js';
import { RotateAdminTokenDto } from './auth.dto.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('check')
  async check(@Headers(ADMIN_TOKEN_HEADER) token?: string) {
    await this.auth.assertAdmin(token);
    return { admin: true };
  }

  @Put('token')
  @UseGuards(AdminGuard)
  async rotate(@Body() body: RotateAdminTokenDto) {
    await this.auth.rotate(body.token);
    return { admin: true };
  }
}
