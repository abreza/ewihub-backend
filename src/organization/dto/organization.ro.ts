import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { UserRo } from '../../user/dto/user.ro';

export class OrganizationListItemRo {
  @Expose()
  @ApiProperty({ description: 'Organization ID' })
  @Transform(({ obj }) => obj._id?.toString() ?? obj.id)
  id: string;

  @Expose()
  @ApiProperty({ description: 'Organization name' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Abbreviated name' })
  abbreviation: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Logo URL' })
  logo: string | null;

  @Expose()
  @ApiProperty({ description: 'API Key' })
  apiKey: string;

  @Expose()
  @ApiProperty({ description: 'Enabled courses', type: [String] })
  courses: string[];

  @Expose()
  @ApiProperty({ description: 'Enable departments' })
  enableDepartments: boolean;

  @Expose()
  @ApiProperty({ description: 'Is active' })
  active: boolean;
}

export class OrganizationDetailRo {
  @Expose()
  @ApiProperty({ description: 'Organization ID' })
  @Transform(({ obj }) => obj._id?.toString() ?? obj.id)
  id: string;

  @Expose()
  @ApiProperty({ description: 'Organization name' })
  name: string;

  @Expose()
  @ApiProperty({ description: 'Abbreviated name' })
  abbreviation: string;

  @Expose()
  @ApiPropertyOptional({ description: 'Notes' })
  notes: string | null;

  @Expose()
  @ApiPropertyOptional({ description: 'Logo URL' })
  logo: string | null;

  @Expose()
  @ApiProperty({ description: 'API Key' })
  apiKey: string;

  @Expose()
  @ApiProperty({ description: 'Enabled courses', type: [String] })
  courses: string[];

  @Expose()
  @ApiProperty({ description: 'Enable departments' })
  enableDepartments: boolean;

  @Expose()
  @ApiProperty({ description: 'Is active' })
  active: boolean;

  @Expose()
  @ApiProperty({ description: 'Organization users', type: [UserRo] })
  @Type(() => UserRo)
  users: UserRo[];

  @Expose()
  @ApiProperty({ description: 'Departments', type: [String] })
  departments: string[];

  @Expose()
  @ApiProperty({ description: 'Creation timestamp' })
  @Transform(({ obj }) => obj.createdAt?.toISOString?.() ?? obj.createdAt)
  createdAt: string;

  @Expose()
  @ApiProperty({ description: 'Update timestamp' })
  @Transform(({ obj }) => obj.updatedAt?.toISOString?.() ?? obj.updatedAt)
  updatedAt: string;
}
