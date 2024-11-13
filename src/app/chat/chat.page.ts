import {
  Component,
  ElementRef,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import io from 'socket.io-client';
import { ImageUploadService } from '../services/image-upload.service';
import { format } from 'date-fns';
import { Platform, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
  GalleryPhotos,
  Photo,
} from '@capacitor/camera';
import { ToastService } from '../services/toast.service';

export interface IActionButtonConfig {
  text: string;
  icon: string;
  data: string;
}

interface IMessage {
  _id: string;
  from: string;
  to: string;
  isGroup: boolean;
  content: string;
  imageUrls: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface IGroupedMessage {
  [key: string]: IMessage[][];
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit {
  sender = '';
  receiver = '';
  socket: any;
  message = '';
  messages: IMessage[] = [];
  groupedMessages: IGroupedMessage = {};
  showTyping = false;
  typingTimeout: any;
  fileType = 'image/jpeg';
  files: string[] = [];
  today = format(new Date(), 'yyyy-MM-dd');
  isDesktop!: boolean;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  actionSheetButtons: IActionButtonConfig[] = [
    {
      text: 'Upload',
      icon: 'cloud-upload-outline',
      data: 'upload',
    },
    {
      text: 'Scan',
      icon: 'camera-outline',
      data: 'scan',
    },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private imageUploadService: ImageUploadService,
    private platform: Platform,
    private toastService: ToastService
  ) {}

  toastController = inject(ToastController);

  ngOnInit() {
    this.isDesktop =
      this.platform.is('desktop') && Capacitor.getPlatform() === 'web'
        ? true
        : false;
    this.route.queryParamMap.subscribe({
      next: (params) => {
        const user1 = params.get('sender');
        const user2 = params.get('receiver');
        if (user1 && user2) {
          this.sender = user1;
          this.receiver = user2;
          this.initialSocket();
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (error) => {
        console.error('Error: ', error);
      },
    });
  }

  groupMessages() {
    this.groupedMessages = {};
    this.messages.forEach((message) => {
      const date = format(new Date(message.createdAt), 'yyyy-MM-dd');

      if (!this.groupedMessages[date]) {
        this.groupedMessages[date] = [];
      }

      const data = this.groupedMessages[date];

      if (data.length === 0 || data[data.length - 1][0].from !== message.from) {
        data.push([message]);
      } else {
        data[data.length - 1].push(message);
      }
    });

    console.log('groupedMessages:', this.groupedMessages);
  }

  initialSocket = () => {
    this.socket = io('https://backend-chat-6wdi.onrender.com/', {
      query: { userId: this.sender },
    });
    // this.socket = io('http://localhost:3000/', {
    //   query: { userId: this.sender },
    // });

    this.socket.on('connect', () => {
      console.log('Connected to server', this.socket);
    });

    this.getMessages();

    this.socket.on('message_history', (messages: any[]) => {
      this.messages = messages; // Gets message history with the selected user
      this.groupMessages();
    });

    this.socket.on('private_message', (message: any) => {
      this.messages.push(message); //gets the created private message
      this.groupMessages();
    });

    this.socket.on('message_deleted', (deletedMsgId: string) => {
      const deleteIndex = this.messages.findIndex(
        (msg) => msg['_id'].toString().trim() === deletedMsgId
      );
      this.messages[deleteIndex].status = 'DELETED';
    });

    this.socket.on('user_typing', (typing: boolean) => {
      this.showTyping = typing; //Toggles typing animation
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });
  };

  getMessages = () => {
    this.socket.emit('fetch_messages', {
      userId: this.sender,
      chatWithId: this.receiver,
      isGroup: false,
    }); // fetch message history
  };

  onTyping() {
    this.socket.emit('typing', {
      to: this.receiver,
      typing: this.message.length > 0,
    });

    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.socket.emit('typing', {
        to: this.receiver,
        typing: false,
      });
    }, 2000);
  }

  sendPrivateMessage = () => {
    if (this.message && this.files.length > 1) {
      this.socket.emit('send_private_message', {
        from: this.sender,
        to: this.receiver,
        content: this.message,
        imageUrl: this.files[0],
      }); // send private message
      this.message = '';
      this.files.splice(0, 1);
    }
    this.socket.emit('send_private_message', {
      from: this.sender,
      to: this.receiver,
      content: this.message,
      imageUrl: this.files[0],
    });
    this.message = '';
    this.files = [];
    this.onTyping();
  };

  deleteMessage = (message: IMessage) => {
    // if (message.from === this.sender) {
    //   this.socket.emit('delete_message', { message, userId: this.sender });
    // }
  };

  private async showFileLimitToast() {
    this.toastService.showToast({
      message: 'You can only upload up to 5 files.',
      duration: 2000,
      color: 'danger',
    });
  }

  private async showFileUploadErrorToast() {
    this.toastService.showToast({
      message: 'File upload failed. Please try again.',
      duration: 2000,
      color: 'danger',
    });
  }

  private isFileLimitExceeded(newFilesCount: number): boolean {
    return this.files.length + newFilesCount > 5;
  }

  onDropFiles(files: string[]): void {
    if (this.isFileLimitExceeded(files.length)) {
      this.showFileLimitToast();
      return;
    }
    this.files.push(...files);
    console.log(this.files);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input && input.files) {
      const files = Array.from(input.files);

      if (files.length === 0) return;

      if (this.isFileLimitExceeded(files.length)) {
        this.showFileLimitToast();
        return;
      }

      this.uploadFiles(files);
    }
  }

  private uploadFiles(files: File[]): void {
    this.imageUploadService.uploadFile(files).subscribe({
      next: (response) => {
        // Handle the response after successful file upload
        if (this.isFileLimitExceeded(response.files.length)) {
          this.showFileLimitToast();
          return;
        }
        this.files.push(...response.files);
        console.log('Uploaded files:', this.files);
      },
      error: (error) => {
        console.error('File upload failed', error);
        this.showFileUploadErrorToast();
      },
    });
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onSelect(event: CustomEvent) {
    const selection = event.detail.data;
    if (!selection) {
      return;
    }
    if (selection === 'scan') {
      this.onPickScan();
    } else if (selection === 'upload') {
      this.onPickUpload();
    }
  }

  onPickScan() {
    if (!Capacitor.isPluginAvailable('Camera')) {
      return;
    }
    Camera.getPhoto({
      quality: 50,
      source: CameraSource.Camera,
      correctOrientation: true,
      width: 92,
      height: 69,
      resultType: CameraResultType.DataUrl,
    })
      .then((image: Photo) => {
        if (image && image.webPath) {
          this.uploadFilesFromUri([image.webPath]);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

  onPickUpload() {
    if (!Capacitor.isPluginAvailable('Camera')) {
      return;
    }
    Camera.pickImages({
      correctOrientation: true,
      width: 92,
      height: 69,
      limit: 5,
      quality: 50,
    })
      .then((images: GalleryPhotos) => {
        if (images && images.photos.length > 0) {
          const imageUris = images.photos.map((image) => image.webPath);
          // Upload selected images
          this.uploadFilesFromUri(imageUris);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

  private uploadFilesFromUri(imageUris: string[]) {
    const files: File[] = [];

    imageUris.forEach((uri) => {
      // Convert the URI to a File object and add it to the upload queue
      fetch(uri)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], uri.split('/').pop() || 'image.jpg', {
            type: 'image/jpeg',
          });
          files.push(file);
          if (files.length === imageUris.length) {
            // After collecting all files, upload them
            this.uploadFiles(files);
          }
        })
        .catch((error) => {
          console.error('Error converting URI to file:', error);
        });
    });
  }

  onDelete(index: number) {
    this.imageUploadService.deleteFile(this.files[index]).subscribe({
      next: () => {
        this.files.splice(index, 1);
      },
      error: (error) => {
        console.error(error);
      },
    });
  }

  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  currentVisibleDate: string = '';

  onScroll(event: any): void {
    const container = this.messagesContainer.nativeElement;
    const containerTop = container.getBoundingClientRect().top;

    // Track the date that is closest to the top of the container
    let closestDate = '';

    for (let dateGroup of Object.keys(this.groupedMessages)) {
      const dateElement = document.getElementById(`date-${dateGroup}`);
      if (dateElement) {
        const dateElementTop = dateElement.getBoundingClientRect().top;

        // Check if this date element is at or above the top of the container
        if (dateElementTop < containerTop + 20) {
          closestDate = dateGroup;
        } else {
          // Break once we find the first element below the container's top
          break;
        }
      }
    }

    // Update the current visible date to the closest date above the top edge
    this.currentVisibleDate =
      closestDate === this.today ? 'Today' : closestDate;
  }
}
