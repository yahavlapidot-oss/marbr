import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FraudService } from './fraud.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('fraud')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('fraud')
export class FraudController {
  constructor(private readonly svc: FraudService) {}

  @Get('flags')
  @ApiOperation({ summary: 'List open fraud flags' })
  listFlags(@Query('resolved') resolved?: string) {
    return this.svc.listFlags(resolved === 'true');
  }

  @Get('check/:userId')
  @ApiOperation({ summary: 'Check if a user is flagged as suspicious' })
  checkUser(@Param('userId') userId: string) {
    return this.svc.checkUser(userId);
  }

  @Patch('flags/:id/resolve')
  @ApiOperation({ summary: 'Mark a fraud flag as resolved' })
  resolve(@Param('id') id: string) {
    return this.svc.resolve(id);
  }
}
