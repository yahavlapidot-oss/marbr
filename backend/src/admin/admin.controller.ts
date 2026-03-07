import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platform-wide stats' })
  getStats() { return this.svc.getStats(); }

  @Get('businesses')
  @ApiOperation({ summary: 'List all businesses' })
  listBusinesses(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.listBusinesses(Number(page ?? 1), Number(limit ?? 50));
  }

  @Patch('businesses/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate a business' })
  toggleBusiness(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.svc.toggleBusinessStatus(id, body.isActive);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  listUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.svc.listUsers(Number(page ?? 1), Number(limit ?? 50));
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Activate or deactivate a user' })
  toggleUser(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.svc.toggleUserStatus(id, body.isActive);
  }
}
