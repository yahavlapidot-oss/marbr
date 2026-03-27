import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto, UpdateBusinessDto } from './dto/create-business.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('businesses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly svc: BusinessesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new business' })
  create(@CurrentUser() u: { id: string }, @Body() dto: CreateBusinessDto) {
    return this.svc.create(u.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get all businesses the current user belongs to' })
  findMine(@CurrentUser() u: { id: string }) {
    return this.svc.findByUser(u.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get business details' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update business' })
  update(@Param('id') id: string, @Body() dto: UpdateBusinessDto) {
    return this.svc.update(id, dto);
  }

  @Get(':id/campaigns')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.BARTENDER, UserRole.CASHIER, UserRole.HOSTESS, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all campaigns for a business (own business only)' })
  getCampaigns(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.svc.getCampaigns(id, user.id);
  }

}
