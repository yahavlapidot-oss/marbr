import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.getMe(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update current user profile' })
  updateMe(@CurrentUser() user: { id: string }, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete (deactivate) current user account' })
  deleteMe(@CurrentUser() user: { id: string }) {
    return this.usersService.deleteMe(user.id);
  }

  @Get('rewards')
  @ApiOperation({ summary: 'Get my rewards' })
  getMyRewards(@CurrentUser() user: { id: string }) {
    return this.usersService.getMyRewards(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get my participation history' })
  getMyHistory(@CurrentUser() user: { id: string }) {
    return this.usersService.getMyHistory(user.id);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Get my notifications' })
  getMyNotifications(@CurrentUser() user: { id: string }) {
    return this.usersService.getMyNotifications(user.id);
  }

  @Get('favorites')
  @ApiOperation({ summary: 'Get my favorite businesses' })
  getFavorites(@CurrentUser() user: { id: string }) {
    return this.usersService.getFavorites(user.id);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Change password' })
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(user.id, body.currentPassword, body.newPassword);
  }

  @Patch('favorites/:businessId')
  @ApiOperation({ summary: 'Toggle a business as favorite' })
  toggleFavorite(
    @CurrentUser() user: { id: string },
    @Param('businessId') businessId: string,
  ) {
    return this.usersService.toggleFavorite(user.id, businessId);
  }
}
