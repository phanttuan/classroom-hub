import { Controller, Get, Patch, Post, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { UserService } from './user.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface.js';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  async getProfile(@Req() req: RequestWithUser) {
    const userId = BigInt(req.user!.id);
    return this.userService.getProfile(userId);
  }

  @Patch('me')
  async updateProfile(@Req() req: RequestWithUser, @Body() dto: UpdateProfileDto) {
    const userId = BigInt(req.user!.id);
    return this.userService.updateProfile(userId, dto);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(@Req() req: RequestWithUser, @Body() dto: ChangePasswordDto) {
    const userId = BigInt(req.user!.id);
    return this.userService.changePassword(userId, dto);
  }
}
