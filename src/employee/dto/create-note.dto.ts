import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNoteDto {
  @ApiProperty({
    description: 'Note content in Markdown format',
    example: '## Follow-up\n\n- Called employee about **ergonomic chair**',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  content: string;
}
