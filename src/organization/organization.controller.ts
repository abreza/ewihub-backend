import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFile,
  UseInterceptors,
  SetMetadata,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { OrganizationService } from './organization.service';
import { EwihubScraperService } from './ewihub-scraper.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddOrgUserDto, UpdateOrgUserDto } from './dto/org-user.dto';
import { SyncEwihubDto } from './dto/sync-ewihub.dto';
import {
  OrganizationDetailRo,
  OrganizationListItemRo,
} from './dto/organization.ro';
import { SyncResultRo } from './dto/sync-result.ro';
import { UserRo } from '../user/dto/user.ro';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { OrgMemberGuard } from '../auth/guards/org-member.guard';
import { SKIP_ADMIN_GUARD_KEY } from '../auth/guards/admin.guard';
import { IdDto } from '../common/dto/id.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { SeedResultRo } from './dto/seed-result.ro';
import { OrganizationSeedService } from './seed/organization-seed.service';
import { CurrentUser, CurrentUserType } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../user/schemas/user.schema';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
@UseGuards(JwtAuthGuard, AdminGuard)
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly ewihubScraperService: EwihubScraperService,
    private readonly seedService: OrganizationSeedService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: 201, type: OrganizationDetailRo })
  @ApiResponse({ status: 409, description: 'Abbreviation already exists' })
  async create(
    @Body() dto: CreateOrganizationDto,
  ): Promise<OrganizationDetailRo> {
    return this.organizationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations' })
  @ApiResponse({ status: 200, type: [OrganizationListItemRo] })
  async findAll(): Promise<OrganizationListItemRo[]> {
    return this.organizationService.findAll();
  }

  @Get(':id')
  @SetMetadata(SKIP_ADMIN_GUARD_KEY, true)
  @UseGuards(OrgMemberGuard)
  @ApiOperation({ summary: 'Get organization detail by ID' })
  @ApiResponse({ status: 200, type: OrganizationDetailRo })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(
    @Param() { id }: IdDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<OrganizationDetailRo> {
    if (user.role === UserRole.OrgUser && user.organizationId !== id) {
      throw new ForbiddenException('You can only access your own organization');
    }

    return this.organizationService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization' })
  @ApiResponse({ status: 200, type: OrganizationDetailRo })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async update(
    @Param() { id }: IdDto,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationDetailRo> {
    return this.organizationService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiResponse({ status: 200, description: 'Organization deleted' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async remove(@Param() { id }: IdDto): Promise<void> {
    return this.organizationService.remove(id);
  }

  @Post(':id/regenerate-api-key')
  @ApiOperation({ summary: 'Regenerate API key for organization' })
  @ApiResponse({ status: 200, type: OrganizationDetailRo })
  async regenerateApiKey(
    @Param() { id }: IdDto,
  ): Promise<OrganizationDetailRo> {
    return this.organizationService.regenerateApiKey(id);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'List users of an organization' })
  @ApiResponse({ status: 200, type: [UserRo] })
  async getUsers(@Param() { id }: IdDto): Promise<UserRo[]> {
    return this.organizationService.getOrgUsers(id);
  }

  @Post(':id/users')
  @ApiOperation({ summary: 'Add a user to organization' })
  @ApiResponse({ status: 201, type: UserRo })
  @ApiResponse({ status: 409, description: 'Email or username already exists' })
  async addUser(
    @Param() { id }: IdDto,
    @Body() dto: AddOrgUserDto,
  ): Promise<UserRo> {
    return this.organizationService.addUser(id, dto);
  }

  @Patch(':id/users/:userId')
  @ApiOperation({ summary: 'Update an organization user' })
  @ApiParam({ name: 'userId' })
  @ApiResponse({ status: 200, type: UserRo })
  async updateUser(
    @Param() { id }: IdDto,
    @Param('userId') userId: string,
    @Body() dto: UpdateOrgUserDto,
  ): Promise<UserRo> {
    return this.organizationService.updateUser(id, userId, dto);
  }

  @Delete(':id/users/:userId')
  @ApiOperation({ summary: 'Remove an organization user' })
  @ApiParam({ name: 'userId' })
  @ApiResponse({ status: 200, description: 'User removed' })
  async removeUser(
    @Param() { id }: IdDto,
    @Param('userId') userId: string,
  ): Promise<void> {
    return this.organizationService.removeUser(id, userId);
  }

  @Post(':id/sync-ewihub-super-admin')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sync employee data from ewihub.com (admin-based)',
    description:
      'Super-admin endpoint. Logs in to ewihub.com with admin credentials ' +
      'creates a temporary org user, scrapes every employee ' +
      'profile, upserts the data, and removes the temp user. ' +
      'No org-user credentials required.',
  })
  @ApiResponse({ status: 200, type: SyncResultRo })
  @ApiResponse({ status: 400, description: 'Admin credentials not configured or org not found' })
  @ApiResponse({ status: 401, description: 'EWI Hub admin credentials invalid' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async syncFromEwihubSuperAdmin(
    @Param() { id }: IdDto,
  ): Promise<SyncResultRo> {
    return this.ewihubScraperService.scrapeAndSync(id);
  }

  @Post(':id/sync-ewihub')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Sync employee data from ewihub.com',
    description:
      'Logs in to ewihub.com with the supplied organization-user ' +
      'credentials, scrapes every employee profile, and upserts the data. ' +
      'Existing employees (matched by email) are updated; new ones are created.',
  })
  @ApiResponse({ status: 200, type: SyncResultRo })
  @ApiResponse({ status: 401, description: 'EWI Hub credentials invalid' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async syncFromEwihub(
    @Param() { id }: IdDto,
    @Body() dto: SyncEwihubDto,
  ): Promise<SyncResultRo> {
    return this.ewihubScraperService.scrapeAndSyncWithCredentials(
      id,
      dto.email,
      dto.password,
    );
  }

  @Post('seed')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Seed organizations from a JSON file upload' })
  @ApiBody({
    description: 'JSON file containing an array of organization seed objects',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 200, type: SeedResultRo })
  @ApiResponse({ status: 400, description: 'Invalid JSON or missing file' })
  async seedFromFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5 MB
          new FileTypeValidator({
            fileType: 'application/json', skipMagicNumbersValidation: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<SeedResultRo> {
    const data = JSON.parse(file.buffer.toString('utf-8'));
    return this.seedService.seedFromData(data);
  }
}
