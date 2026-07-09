import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNoteDto {
  @ApiProperty({
    description: 'Updated note content in Markdown format',
    example: '## Follow-up\n\nResolved — chair delivered.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  content: string;
}
