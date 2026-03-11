import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import * as crypto from 'crypto';
import {
  Organization,
  OrganizationDocument,
} from './schemas/organization.schema';
import { UserService } from '../user/user.service';
import { UserRo } from '../user/dto/user.ro';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddOrgUserDto, UpdateOrgUserDto } from './dto/org-user.dto';
import {
  OrganizationDetailRo,
  OrganizationListItemRo,
} from './dto/organization.ro';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    private readonly userService: UserService,
  ) { }

  async create(dto: CreateOrganizationDto): Promise<OrganizationDetailRo> {
    const existing = await this.orgModel
      .findOne({ abbreviation: dto.abbreviation })
      .exec();
    if (existing) {
      throw new ConflictException(
        `Organization with abbreviation "${dto.abbreviation}" already exists`,
      );
    }

    const apiKey = this.generateApiKey();
    const org = new this.orgModel({ ...dto, apiKey });
    const saved = await org.save();
    return this.toDetailRo(saved);
  }

  async findAll(): Promise<OrganizationListItemRo[]> {
    const orgs = await this.orgModel.find().exec();
    return orgs.map((org) =>
      plainToInstance(OrganizationListItemRo, org.toObject(), {
        excludeExtraneousValues: true,
      }),
    );
  }

  async findOne(id: string): Promise<OrganizationDetailRo> {
    const org = await this.findOrFail(id);
    return this.toDetailRo(org);
  }

  async update(
    id: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationDetailRo> {
    const org = await this.findOrFail(id);

    if (dto.abbreviation && dto.abbreviation !== org.abbreviation) {
      const existing = await this.orgModel
        .findOne({ abbreviation: dto.abbreviation, _id: { $ne: org._id } })
        .exec();
      if (existing) {
        throw new ConflictException(
          `Organization with abbreviation "${dto.abbreviation}" already exists`,
        );
      }
    }

    Object.assign(org, dto);
    const saved = await org.save();
    return this.toDetailRo(saved);
  }

  async remove(id: string): Promise<void> {
    const org = await this.findOrFail(id);
    await this.userService.removeByOrganization(id);
    await this.orgModel.findByIdAndDelete(org._id).exec();
  }

  async regenerateApiKey(id: string): Promise<OrganizationDetailRo> {
    const org = await this.findOrFail(id);
    org.apiKey = this.generateApiKey();
    const saved = await org.save();
    return this.toDetailRo(saved);
  }

  async addUser(orgId: string, dto: AddOrgUserDto): Promise<UserRo> {
    await this.findOrFail(orgId); // ensure org exists
    return this.userService.createOrgUser(orgId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      username: dto.username,
      password: dto.password,
    });
  }

  async updateUser(
    orgId: string,
    userId: string,
    dto: UpdateOrgUserDto,
  ): Promise<UserRo> {
    await this.findOrFail(orgId);

    const user = await this.userService.findOne(userId);
    if (user.organization !== orgId) {
      throw new NotFoundException(`User ${userId} not found in this organization`);
    }

    return this.userService.update(userId, dto);
  }

  async removeUser(orgId: string, userId: string): Promise<void> {
    await this.findOrFail(orgId);

    const user = await this.userService.findOne(userId);
    if (user.organization !== orgId) {
      throw new NotFoundException(`User ${userId} not found in this organization`);
    }

    return this.userService.remove(userId);
  }

  async getOrgUsers(orgId: string): Promise<UserRo[]> {
    await this.findOrFail(orgId);
    return this.userService.findByOrganization(orgId);
  }

  async findByApiKey(apiKey: string): Promise<OrganizationDocument | null> {
    return this.orgModel.findOne({ apiKey, active: true }).exec();
  }

  async ensureDepartment(orgId: string, department: string): Promise<void> {
    await this.orgModel
      .updateOne({ _id: orgId }, { $addToSet: { departments: department } })
      .exec();
  }

  private async findOrFail(id: string): Promise<OrganizationDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Organization ${id} not found`);
    }
    const org = await this.orgModel.findById(id).exec();
    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }
    return org;
  }

  private async toDetailRo(org: OrganizationDocument): Promise<OrganizationDetailRo> {
    const orgObj = org.toObject();
    const users = await this.userService.findByOrganization(
      (org._id as any).toString(),
    );

    return plainToInstance(
      OrganizationDetailRo,
      { ...orgObj, users },
      { excludeExtraneousValues: true },
    );
  }

  private generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}
