import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EntriesService } from './entries.service';
import { ScanEntryDto } from './dto/scan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('entries')
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a campaign entry (scan or manual code)' })
  createEntry(
    @CurrentUser() user: { id: string },
    @Body() dto: ScanEntryDto,
  ) {
    return this.entriesService.createEntry(user.id, dto);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get entry status' })
  getStatus(@Param('id') id: string) {
    return this.entriesService.getEntryStatus(id);
  }
}
