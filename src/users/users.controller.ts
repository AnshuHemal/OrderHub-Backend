import {
  Controller, Get, Patch, Delete,
  Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserRoleDto } from './dto/user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'List all users' })
  findAll() { return this.svc.findAll(); }

  @Get('workload')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Staff workload summary' })
  workload() { return this.svc.getWorkload(); }

  @Get(':id')
  @Roles('OWNER', 'MANAGER')
  @ApiOperation({ summary: 'Get user by id' })
  findOne(@Param('id') id: string) { return this.svc.findOne(id); }

  @Patch(':id/role')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Update user role (OWNER only)' })
  updateRole(
    @CurrentUser() actor: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.svc.updateRole(actor.id, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user (OWNER only)' })
  remove(
    @CurrentUser() actor: { id: string },
    @Param('id') id: string,
  ) {
    return this.svc.remove(actor.id, id);
  }
}
