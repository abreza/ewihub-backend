import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { PaginationMetaRo } from './paginated.ro';
import { EmployeeListItemRo } from './employee-list-item.ro';

export class PaginatedEmployeesRo {
  @Expose()
  @ApiProperty({ type: [EmployeeListItemRo] })
  @Type(() => EmployeeListItemRo)
  data: EmployeeListItemRo[];

  @Expose()
  @ApiProperty({ type: PaginationMetaRo })
  @Type(() => PaginationMetaRo)
  meta: PaginationMetaRo;
}
