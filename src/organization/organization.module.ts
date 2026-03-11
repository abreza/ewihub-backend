import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './schemas/organization.schema';
import { Employee, EmployeeSchema } from '../employee/schemas/employee.schema';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { OrganizationSeedService } from './seed/organization-seed.service';
import { EwihubScraperService } from './ewihub-scraper.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: Organization.name, schema: OrganizationSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationSeedService, EwihubScraperService],
  exports: [OrganizationService],
})
export class OrganizationModule { }
