import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { plainToInstance } from 'class-transformer';
import { S3Service } from '../s3/s3.service';
import { EmployeeService } from './employee.service';
import { EmployeeDocument } from './schemas/employee.schema';
import { AttachmentRo, AttachmentWithUrlRo } from './dto/attachment.ro';

@Injectable()
export class EmployeeAttachmentService {
  constructor(
    private readonly s3Service: S3Service,
    private readonly employeeService: EmployeeService,
  ) { }

  async upload(
    employeeId: string,
    file: Express.Multer.File,
    label: string | null,
    uploadedBy: string | null,
    orgFilter: string | null,
  ): Promise<AttachmentRo> {
    const employee = await this.employeeService.findEmployeeOrFail(
      employeeId,
      orgFilter,
    );

    const result = await this.s3Service.upload(file, employeeId);

    employee.attachments.push({
      key: result.key,
      originalName: result.originalName,
      mimeType: result.mimeType,
      size: result.size,
      label: label || null,
      uploadedBy: uploadedBy || null,
    } as any);

    const saved = await employee.save();
    const added = saved.attachments[saved.attachments.length - 1] as any;

    return plainToInstance(AttachmentRo, added.toObject?.() ?? added, {
      excludeExtraneousValues: true,
    });
  }

  async listAttachments(
    employeeId: string,
    orgFilter: string | null,
  ): Promise<AttachmentWithUrlRo[]> {
    const employee = await this.employeeService.findEmployeeOrFail(
      employeeId,
      orgFilter,
    );

    const results: AttachmentWithUrlRo[] = [];

    for (const att of employee.attachments) {
      const obj = (att as any).toObject?.() ?? att;
      const url = await this.s3Service.getSignedUrl(obj.key);
      results.push(
        plainToInstance(
          AttachmentWithUrlRo,
          { ...obj, url },
          { excludeExtraneousValues: true },
        ),
      );
    }

    return results;
  }

  async getDownloadUrl(
    employeeId: string,
    attachmentId: string,
    orgFilter: string | null,
  ): Promise<AttachmentWithUrlRo> {
    const employee = await this.employeeService.findEmployeeOrFail(
      employeeId,
      orgFilter,
    );

    const attachment = this.findAttachmentOrFail(employee, attachmentId);
    const obj = (attachment as any).toObject?.() ?? attachment;
    const url = await this.s3Service.getSignedUrl(obj.key);

    return plainToInstance(
      AttachmentWithUrlRo,
      { ...obj, url },
      { excludeExtraneousValues: true },
    );
  }

  async removeAttachment(
    employeeId: string,
    attachmentId: string,
    orgFilter: string | null,
  ): Promise<void> {
    const employee = await this.employeeService.findEmployeeOrFail(
      employeeId,
      orgFilter,
    );

    const attachment = this.findAttachmentOrFail(employee, attachmentId);
    const key = (attachment as any).key;

    await this.s3Service.delete(key);

    (attachment as any).deleteOne();
    await employee.save();
  }

  async removeAllAttachments(employee: EmployeeDocument): Promise<void> {
    const keys = employee.attachments.map((a: any) => a.key);
    if (keys.length > 0) {
      await this.s3Service.deleteMany(keys);
    }
  }

  private findAttachmentOrFail(
    employee: EmployeeDocument,
    attachmentId: string,
  ): any {
    const attachments = employee.attachments as Types.DocumentArray<any>;
    const attachment = attachments.id(attachmentId);
    if (!attachment) {
      throw new NotFoundException(`Attachment ${attachmentId} not found`);
    }
    return attachment;
  }
}
