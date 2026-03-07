import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class InviteEmployeeDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty({ enum: [UserRole.MANAGER, UserRole.BARTENDER, UserRole.CASHIER, UserRole.HOSTESS] })
  @IsEnum(UserRole) role: UserRole;
  @ApiPropertyOptional() @IsOptional() @IsString() branchId?: string;
}

export class UpdateEmployeeRoleDto {
  @ApiProperty({ enum: UserRole }) @IsEnum(UserRole) role: UserRole;
}
