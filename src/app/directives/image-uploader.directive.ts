import {
  Directive,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { ImageUploadService } from '../services/image-upload.service';
import { ToastService } from '../services/toast.service';

enum DropColor {
  Default = '#ffffff', // Default color
  Over = '#ACADAD', // Color to be used once the file is "over" the drop box
}

@Directive({
  selector: '[appImageUploader]',
})
export class ImageUploaderDirective {
  constructor(
    private imageUploadService: ImageUploadService,
    private toastService: ToastService
  ) {}

  @Output() dropFiles: EventEmitter<string[]> = new EventEmitter();
  @Input() fileType = '';
  @HostBinding('style.background') backgroundColor = DropColor.Default;

  @HostListener('dragover', ['$event']) public dragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.backgroundColor = DropColor.Over;
  }

  @HostListener('dragleave', ['$event']) public dragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.backgroundColor = DropColor.Default;
  }

  @HostListener('drop', ['$event']) public drop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.backgroundColor = DropColor.Default;

    let fileList = event.dataTransfer?.files || [];
    const files: File[] = Array.from(fileList);

    if (this.fileType && !this.isValidFileType(files)) {
      this.toastService.showToast({
        message: 'Invalid file type!',
        duration: 2000,
        color: 'danger',
      });
      return;
    }

    if (files.length > 0) {
      this.uploadFiles(files);
    }
  }

  private isValidFileType(files: File[]): boolean {
    return files.every((file) => file.type.startsWith(this.fileType));
  }

  private uploadFiles(files: File[]): void {
    this.imageUploadService.uploadFile(files).subscribe({
      next: (response) => {
        if (response.files.length > 0) {
          this.dropFiles.emit(response.files);
        }
      },
      error: (error) => {
        console.error('File upload failed', error);
        this.toastService.showToast({
          message: 'File upload failed. Please try again.',
          duration: 2000,
          color: 'danger',
        });
      },
    });
  }
}
