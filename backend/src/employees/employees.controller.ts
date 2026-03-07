import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { EmployeesService } from './employees.service';
import { InviteEmployeeDto, UpdateEmployeeRoleDto } from './dto/invite-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly svc: EmployeesService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Invite employee to business' })
  invite(@Query('businessId') businessId: string, @Body() dto: InviteEmployeeDto) {
    return this.svc.invite(businessId, dto);
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'List employees for a business' })
  findAll(@Query('businessId') businessId: string) {
    return this.svc.findByBusiness(businessId);
  }

  @Patch(':id/role')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Change employee role' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateEmployeeRoleDto) {
    return this.svc.updateRole(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Revoke employee access' })
  revoke(@Param('id') id: string) {
    return this.svc.revoke(id);
  }
}
