import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { EmployeeService } from './employee.service';
import { EmployeeDocument } from './schemas/employee.schema';
import { Note } from './schemas/note.schema';
import { NoteRo } from './dto/note.ro';

@Injectable()
export class EmployeeNoteService {
  constructor(private readonly employeeService: EmployeeService) {}

  async listNotes(
    employeeId: string,
    orgFilter: string | null,
  ): Promise<NoteRo[]> {
    const employee = await this.employeeService.findEmployeeOrFail(
      employeeId,
      orgFilter,
    );

    return [...employee.notes]
      .map((note) => this.toRo(note))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addNote(
    employeeId: string,
    content: string,
    author: { id: string | null; name: string | null },
    orgFilter: string | null,
  ): Promise<NoteRo> {
    const employee = await this.employeeService.findEmployeeOrFail(
      employeeId,
      orgFilter,
    );

    employee.notes.push({
      content,
      createdBy: author.id ?? null,
      createdByName: author.name ?? null,
    } as Note);

    const saved = await employee.save();
    const added = saved.notes[saved.notes.length - 1];
    return this.toRo(added);
  }

  async updateNote(
    employeeId: string,
    noteId: string,
    content: string,
    orgFilter: string | null,
  ): Promise<NoteRo> {
    const employee = await this.employeeService.findEmployeeOrFail(
      employeeId,
      orgFilter,
    );

    const note = this.findNoteOrFail(employee, noteId);
    note.content = content;

    await employee.save();
    return this.toRo(note);
  }

  async removeNote(
    employeeId: string,
    noteId: string,
    orgFilter: string | null,
  ): Promise<void> {
    const employee = await this.employeeService.findEmployeeOrFail(
      employeeId,
      orgFilter,
    );

    const note = this.findNoteOrFail(employee, noteId);
    note.deleteOne();
    await employee.save();
  }

  private toRo(note: any): NoteRo {
    return plainToInstance(NoteRo, note.toObject?.() ?? note, {
      excludeExtraneousValues: true,
    });
  }

  private findNoteOrFail(employee: EmployeeDocument, noteId: string): any {
    const notes = employee.notes as Types.DocumentArray<any>;
    const note = notes.id(noteId);
    if (!note) {
      throw new NotFoundException(`Note ${noteId} not found`);
    }
    return note;
  }
}
