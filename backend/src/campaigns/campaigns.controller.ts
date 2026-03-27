import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CampaignStatus, UserRole } from '@prisma/client';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get('active')
  @ApiOperation({ summary: 'Get active campaigns (optionally by location)' })
  @ApiQuery({ name: 'lat', required: false, type: Number })
  @ApiQuery({ name: 'lng', required: false, type: Number })
  @ApiQuery({ name: 'radius', required: false, type: Number })
  findActive(
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('radius') radius?: number,
  ) {
    return this.campaignsService.findActive(lat, lng, radius);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get campaign details' })
  findOne(@Param('id') id: string, @CurrentUser() user?: { id: string }) {
    return this.campaignsService.findOne(id, user?.id);
  }

  @Get(':id/analytics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get campaign analytics' })
  getAnalytics(@Param('id') id: string) {
    return this.campaignsService.getAnalytics(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new campaign' })
  create(
    @CurrentUser() user: { id: string; businessId?: string },
    @Body() dto: CreateCampaignDto,
    @Query('businessId') businessId: string,
  ) {
    return this.campaignsService.create(businessId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update campaign fields' })
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(id, dto);
  }

  @Post(':id/duplicate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Duplicate a campaign as a new DRAFT' })
  duplicate(@Param('id') id: string) {
    return this.campaignsService.duplicate(id);
  }

  @Patch(':id/publish')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Publish campaign (DRAFT → ACTIVE)' })
  publish(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.campaignsService.updateStatus(id, CampaignStatus.ACTIVE, user.id);
  }

  @Patch(':id/pause')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Pause active campaign' })
  pause(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.campaignsService.updateStatus(id, CampaignStatus.PAUSED, user.id);
  }

  @Patch(':id/resume')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Resume paused campaign' })
  resume(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.campaignsService.updateStatus(id, CampaignStatus.ACTIVE, user.id);
  }

  @Patch(':id/end')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'End a campaign' })
  end(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.campaignsService.updateStatus(id, CampaignStatus.ENDED, user.id);
  }

  @Post(':id/products')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Link a product as required purchase for this campaign' })
  addProduct(
    @Param('id') id: string,
    @Body() body: { productId: string; minQuantity?: number },
  ) {
    return this.campaignsService.addProduct(id, body.productId, body.minQuantity);
  }

  @Delete(':id/products/:productId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Remove a required product from this campaign' })
  removeProduct(@Param('id') id: string, @Param('productId') productId: string) {
    return this.campaignsService.removeProduct(id, productId);
  }
}
