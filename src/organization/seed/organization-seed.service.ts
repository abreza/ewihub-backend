import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Organization,
  OrganizationDocument,
} from '../schemas/organization.schema';
import { UserService } from '../../user/user.service';
import { SeedResultRo } from '../dto/seed-result.ro';

interface SeedUser {
  name: string;
  email: string;
  password?: string;
}

interface SeedOrganization {
  abbreviation: string;
  name: string;
  apiKey: string;
  courses: string[];
  enableDepartments: boolean;
  active: boolean;
  notes: string;
  users: SeedUser[];
  departments: string[];
}

@Injectable()
export class OrganizationSeedService {
  private readonly logger = new Logger(OrganizationSeedService.name);

  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    private readonly userService: UserService,
  ) { }

  async seedFromData(data: SeedOrganization[]): Promise<SeedResultRo> {
    if (!Array.isArray(data)) {
      throw new BadRequestException(
        'Seed data must be a JSON array of organization objects.',
      );
    }

    let orgCount = 0;
    let userCount = 0;
    const errors: string[] = [];

    for (const entry of data) {
      try {
        if (!entry.abbreviation || !entry.name) {
          errors.push(
            `Skipped entry: missing required fields (abbreviation, name)`,
          );
          continue;
        }

        const existing = await this.orgModel
          .findOne({ abbreviation: entry.abbreviation })
          .exec();

        if (existing) {
          errors.push(
            `Skipped "${entry.abbreviation}": organization already exists`,
          );
          continue;
        }

        const org = new this.orgModel({
          name: entry.name,
          abbreviation: entry.abbreviation,
          apiKey: entry.apiKey,
          courses: entry.courses ?? [],
          enableDepartments: entry.enableDepartments ?? false,
          active: entry.active ?? true,
          notes: entry.notes || null,
          departments: entry.departments ?? ['Default'],
        });

        const saved = await org.save();
        orgCount++;

        const orgId = (saved._id as any).toString();

        for (const seedUser of entry.users ?? []) {
          try {
            const nameParts = seedUser.name.trim().split(/\s+/);
            const firstName = nameParts[0] || seedUser.name;
            const lastName = nameParts.slice(1).join(' ') || 'User';

            let username = seedUser.email.split('@')[0];
            const existingUser = await this.userService.findByUsername(username).catch(() => null);
            if (existingUser) {
              username = `${username}_${Math.floor(1000 + Math.random() * 9000)}`;
            }

            const defaultPassword =
              seedUser.password ||
              `${entry.abbreviation.toLowerCase()}@seed2026`;

            await this.userService.createOrgUser(orgId, {
              firstName,
              lastName,
              email: seedUser.email,
              username,
              password: defaultPassword,
            });

            userCount++;
          } catch (err) {
            const msg = `Failed to create user ${seedUser.email} for org ${entry.abbreviation}: ${err.message}`;
            this.logger.warn(msg);
            errors.push(msg);
          }
        }
      } catch (err) {
        const msg = `Failed to seed org "${entry.abbreviation}": ${err.message}`;
        this.logger.warn(msg);
        errors.push(msg);
      }
    }

    return {
      organizationsCreated: orgCount,
      usersCreated: userCount,
      errors,
    };
  }
}
