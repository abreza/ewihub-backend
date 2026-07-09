import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { EmployeeService } from './employee.service';
import { EmployeeReportingService } from './employee-reporting.service';
import { EmployeeLmsService } from './employee-lms.service';
import { EmployeeAttachmentService } from './employee-attachment.service';
import { EmployeeNoteService } from './employee-note.service';
import { EmployeeController } from './employee.controller';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [
    forwardRef(() => OrganizationModule),
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [EmployeeController],
  providers: [
    EmployeeService,
    EmployeeReportingService,
    EmployeeLmsService,
    EmployeeAttachmentService,
    EmployeeNoteService,
  ],
  exports: [EmployeeService],
})
export class EmployeeModule {}
