import {
  Directive,
  EventEmitter,
  HostBinding,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { ImageUploadService } from '../services/image-upload.service';

enum DropColor {
  Default = '#ffffff', // Default color
  Over = '#ACADAD', // Color to be used once the file is "over" the drop box
}

@Directive({
  selector: '[appImageUploader]',
})
export class ImageUploaderDirective {
  constructor(private imageUploadService: ImageUploadService) {}

  @Output() dropFiles: EventEmitter<string[]> = new EventEmitter();
  @Input() fileType = '';
  @HostBinding('style.background') backgroundColor = DropColor.Default;

  @HostListener('dragover', ['$event']) public dragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.backgroundColor = DropColor.Over;
  }

  @HostListener('dragleave', ['$event']) public dragLeave(event: DragEvent) {
    console.log('drag leave');
    event.preventDefault();
    event.stopPropagation();
    this.backgroundColor = DropColor.Default;
  }

  // @HostListener('drop', ['$event']) public drop(event: DragEvent) {
  //   event.preventDefault();
  //   event.stopPropagation();
  //   this.backgroundColor = DropColor.Default;

  //   let fileList = event.dataTransfer?.files || [];
  //   let files: string[] = [];
  //   for (let i = 0; i < fileList.length; i++) {
  //     const fr = new FileReader();
  //     fr.onload = () => {
  //       const dataUrl = fr.result?.toString();
  //       files.push(dataUrl as string);
  //     };
  //     fr.readAsDataURL(fileList[i]);
  //   }
  //   if (files.length > 0) {
  //     this.dropFiles.emit(files);
  //   }
  // }

  @HostListener('drop', ['$event']) public drop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.backgroundColor = DropColor.Default;

    let fileList = event.dataTransfer?.files || [];
    let files: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      files.push(fileList[i]);
    }

    if (files.length > 0) {
      this.imageUploadService.uploadFile(files).subscribe({
        next: (response) => {
          this.dropFiles.emit(response.files);
        },
        error: (error) => {
          console.error('File upload failed', error);
        },
      });
    }
  }
}
