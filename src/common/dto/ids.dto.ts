import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsArray, IsOptional } from 'class-validator';
import { Type, Transform, Expose } from 'class-transformer';

export class IdsDto {
  @ApiProperty({
    type: [String],
    description: 'Array of Mongo IDs',
    default: [],
  })
  @Expose()
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @Type(() => String)
  @Transform(({ value, obj }) => {
    if (value === undefined) {
      if (obj['ids[]'] !== undefined) {
        value = obj['ids[]'];
      } else {
        return [];
      }
    }
    return Array.isArray(value) ? value : [value];
  })
  public ids: string[] = [];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  @Type(() => String)
  @Transform(({ value }) => {
    return Array.isArray(value) ? value : [value];
  })
  public 'ids[]': string[] = [];
}
