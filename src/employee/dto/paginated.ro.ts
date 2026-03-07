import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class PaginationMetaRo {
  @Expose()
  @ApiProperty()
  total: number;

  @Expose()
  @ApiProperty()
  page: number;

  @Expose()
  @ApiProperty()
  limit: number;

  @Expose()
  @ApiProperty()
  totalPages: number;
}

export class PaginatedRo<T> {
  @Expose()
  @ApiProperty({ type: [Object] })
  data: T[];

  @Expose()
  @ApiProperty({ type: PaginationMetaRo })
  @Type(() => PaginationMetaRo)
  meta: PaginationMetaRo;
}
