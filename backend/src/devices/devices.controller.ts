import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly svc: DevicesService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register or update device FCM token and last known location' })
  register(
    @CurrentUser() user: { id: string },
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.svc.register(user.id, dto);
  }
}
