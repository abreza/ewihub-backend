import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EmployeeService } from '../employee.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmployeeSeedService implements OnModuleInit {
  private readonly logger = new Logger(EmployeeSeedService.name);

  constructor(private readonly employeeService: EmployeeService) {}

  async onModuleInit() {
    const count = await this.employeeService.count();

    if (count > 0) {
      this.logger.log(
        `Employee collection already has ${count} records — skipping seed.`,
      );
      return;
    }

    const seedPath = path.join(__dirname, '..', '..', 'assets', 'employee-seed.json');

    try {
      this.logger.log(`Seeding employees from: ${seedPath}`);
      const raw = fs.readFileSync(seedPath, 'utf-8');
      const data = JSON.parse(raw);

      if (!Array.isArray(data)) {
        this.logger.error(
          'Seed file must contain a JSON array of employee objects.',
        );
        return;
      }

      const inserted = await this.employeeService.seedFromArray(data);
      this.logger.log(`Successfully seeded ${inserted} employees.`);
    } catch (err) {
      this.logger.error(`Failed to seed employees: ${err.message}`);
    }
  }
}
