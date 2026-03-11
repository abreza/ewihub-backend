import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import {
  Organization,
  OrganizationDocument,
} from '../schemas/organization.schema';
import { UserService } from '../../user/user.service';

interface SeedUser {
  name: string;
  email: string;
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
export class OrganizationSeedService implements OnModuleInit {
  private readonly logger = new Logger(OrganizationSeedService.name);

  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    private readonly userService: UserService,
  ) { }

  async onModuleInit() {
    const count = await this.orgModel.countDocuments().exec();

    if (count > 0) {
      this.logger.log(
        `Organization collection already has ${count} records — skipping seed.`,
      );
      return;
    }

    const seedPath = path.join(
      __dirname,
      '..',
      '..',
      'assets',
      'organization-seed.json',
    );

    try {
      this.logger.log(`Seeding organizations from: ${seedPath}`);
      const raw = fs.readFileSync(seedPath, 'utf-8');
      const data: SeedOrganization[] = JSON.parse(raw);

      if (!Array.isArray(data)) {
        this.logger.error(
          'Seed file must contain a JSON array of organization objects.',
        );
        return;
      }

      let orgCount = 0;
      let userCount = 0;

      for (const entry of data) {
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

            const username = seedUser.email.split('@')[0];
            const defaultPassword = `${entry.abbreviation.toLowerCase()}@seed2024`;

            await this.userService.createOrgUser(orgId, {
              firstName,
              lastName,
              email: seedUser.email,
              username,
              password: defaultPassword,
            });

            userCount++;
          } catch (err) {
            this.logger.warn(
              `Failed to create user ${seedUser.email} for org ${entry.abbreviation}: ${err.message}`,
            );
          }
        }
      }

      this.logger.log(
        `Successfully seeded ${orgCount} organizations and ${userCount} users.`,
      );
    } catch (err) {
      this.logger.error(`Failed to seed organizations: ${err.message}`);
    }
  }
}
