import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import io from 'socket.io-client';
import { ImageUploadService } from '../services/image-upload.service';
import { format } from 'date-fns';
import { Platform } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import {
  Camera,
  CameraResultType,
  CameraSource,
  GalleryPhotos,
  Photo,
} from '@capacitor/camera';
import { ToastService } from '../services/toast.service';
import { register } from 'swiper/element/bundle';
import { SwiperOptions } from 'swiper/types';

// register Swiper custom elements
register();
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
  imageUrl: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface IGroupedMessage {
  [key: string]: IMessage[][];
}

interface IFile {
  uri: string;
  caption: string;
}

interface ISendMessagePayload {
  uri: string | string[];
  message?: string;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})
export class ChatPage implements OnInit {
  maxAttachments = 5;
  activeIndex = 0;
  sender = '';
  receiver = '';
  socket: any;
  message = '';
  messages: IMessage[] = [];
  groupedMessages: IGroupedMessage = {};
  showTyping = false;
  typingTimeout: any;
  fileType = 'image/jpeg';
  files: IFile[] = [
    // {
    //   // uri: 'http://192.168.1.5:8101/_capacitor_file_/data/user/0/io.ionic.starter/cache/1000000032.1731592430120.jpeg',
    //   uri: 'https://picsum.photos/412/700',
    //   caption: '',
    // },
    // {
    //   uri: 'http://192.168.1.5:8101/_capacitor_file_/data/user/0/io.ionic.starter/cache/1000000033.1731592430174.jpeg',
    //   caption: '',
    // },
    // {
    //   uri: 'http://192.168.1.5:8101/_capacitor_file_/data/user/0/io.ionic.starter/cache/1000000034.1731592430221.jpeg',
    //   caption: '',
    // },
    // {
    //   uri: 'http://192.168.1.5:8101/_capacitor_file_/data/user/0/io.ionic.starter/cache/1000000035.1731592430271.jpeg',
    //   caption: '',
    // },
  ];
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
  @ViewChild('messagesContainer') messagesContainer!: ElementRef;
  currentVisibleDate: string = '';
  displayImages = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private imageUploadService: ImageUploadService,
    private platform: Platform,
    private toastService: ToastService,
  ) {}

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
  }

  initialSocket = () => {
    this.socket = io('https://backend-chat-6wdi.onrender.com', {
      query: { userId: this.sender },
    });
    // this.socket = io('http://localhost:3000/', {
    //   query: { userId: this.sender },
    // });

    this.socket.on('connect', () => {});

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
        (msg) => msg['_id'].toString().trim() === deletedMsgId,
      );
      this.messages[deleteIndex].status = 'DELETED';
    });

    this.socket.on('user_typing', (typing: boolean) => {
      this.showTyping = typing; //Toggles typing animation
    });

    this.socket.on('disconnect', () => {});
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

  async sendPrivateMessage() {
    if (!this.message && this.files.length === 0) {
      return;
    }
    if (this.message) {
      this.socket.emit('send_private_message', {
        from: this.sender,
        to: this.receiver,
        content: this.message,
        imageUrl: [],
      });
      this.message = '';
    }
    if (this.files.length) {
      if (this.files.length > this.maxAttachments) {
        this.showFileLimitToast();
        return;
      }
      const payload: ISendMessagePayload[] = this.prepareImagePayload(
        this.files,
      );

      if (!payload.length) {
        return;
      }

      await this.uploadImagesAndSendMessage(payload);
      this.files = [];
    }

    this.onTyping();
  }

  prepareImagePayload(files: IFile[]) {
    const payload: ISendMessagePayload[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.caption) {
        payload.push({ uri: file.uri, message: file.caption });
        continue;
      }
      const images: string[] = [file.uri];
      let j = i + 1;

      while (j < files.length && !files[j].caption) {
        images.push(files[j].uri);
        j++;
      }

      if (images.length > 3) {
        payload.push({ uri: images });
        i = j - 1; // Skip to the next group of images
      } else {
        payload.push({ uri: file.uri });
      }
    }

    return payload;
  }

  async uploadImagesAndSendMessage(payload: ISendMessagePayload[]) {
    for (const element of payload) {
      const uris = Array.isArray(element.uri) ? element.uri : [element.uri];
      const files = await this.convertUriToFiles(uris);

      if (files.length !== uris.length) {
        console.error('File conversion mismatch');
        this.showFileUploadErrorToast();
        break;
      }

      this.uploadImages(files, element.message);
    }
  }

  async convertUriToFiles(uris: string[]): Promise<File[]> {
    const files: File[] = [];

    const fetchPromises = uris.map(async (uri, index) => {
      try {
        const res = await fetch(uri);
        const blob = await res.blob();

        const fileName =
          uri.split('/').pop()?.split('?')[0] || `image${index}.jpg`;

        const file = new File([blob], fileName, { type: 'image/jpeg' });
        files.push(file);
      } catch (error) {
        console.error('Error converting URI to file:', error);
      }
    });

    await Promise.all(fetchPromises);
    return files;
  }

  uploadImages(files: File[], message?: string) {
    this.imageUploadService.uploadFile(files).subscribe({
      next: (response) => {
        if (response.files.length !== files.length) {
          this.showFileUploadErrorToast();
          this.deleteUploadedFiles(response.files);
        } else {
          this.socket.emit('send_private_message', {
            from: this.sender,
            to: this.receiver,
            content: message,
            imageUrl: response.files,
          });
        }
      },
      error: (error) => {
        console.error('File upload failed:', error);
        this.showFileUploadErrorToast();
      },
    });
  }

  deleteUploadedFiles(files: any[]) {
    files.forEach((file) => {
      this.imageUploadService.deleteFile(file).subscribe({
        next: () => {},
        error: (error) => {
          console.error(`Failed to delete file: ${file.name}`, error);
        },
      });
    });
  }

  deleteMessage = (message: IMessage) => {
    // if (message.from === this.sender) {
    //   this.socket.emit('delete_message', { message, userId: this.sender });
    // }
  };

  private showFileLimitToast() {
    this.toastService.showToast({
      message: `You can only upload up to ${this.maxAttachments} files.`,
      duration: 2000,
      color: 'danger',
    });
  }

  private showFileUploadErrorToast() {
    this.toastService.showToast({
      message: 'File upload failed. Please try again.',
      duration: 2000,
      color: 'danger',
    });
  }

  private isFileLimitExceeded(newFilesCount: number): boolean {
    return this.files.length + newFilesCount > this.maxAttachments;
  }

  onSelect(event: CustomEvent) {
    const selection = event.detail.data;
    if (!selection) {
      return;
    }

    if (!Capacitor.isPluginAvailable('Camera')) {
      return;
    }

    Camera.checkPermissions()
      .then((permission) => {
        console.log('permission:', JSON.stringify(permission));

        if (permission.camera === 'denied') {
          Camera.requestPermissions()
            .then(() => {
              console.log('Permission granted');
            })
            .catch((err) => {
              console.error('Permission denied:', err);
              return;
            });
        } else {
          console.log('Permission already granted');
          return;
        }
      })
      .catch((err) => {
        console.error('Error checking permissions:', err);
        return;
      });

    switch (selection) {
      case 'scan':
        this.onPickScan();
        break;
      case 'upload':
        const limit = this.maxAttachments - this.files.length;
        console.log('this.files.length:', this.files.length);
        if (limit >= 1) {
          this.onPickUpload(limit);
        }
        break;
      default:
        console.error('Invalid selection:', selection);
    }
  }

  onPickScan() {
    Camera.getPhoto({
      quality: 100,
      source: CameraSource.Camera,
      correctOrientation: true,
      resultType: CameraResultType.Uri,
    })
      .then((image: Photo) => this.handleImageSelection(image?.webPath))
      .catch((err) => {
        console.error('Error selecting image from camera:', err);
      });
  }

  onPickUpload(limit: number) {
    console.log('limit:', limit);
    Camera.pickImages({
      correctOrientation: true,
      limit: limit,
      quality: 100,
    })
      .then((images: GalleryPhotos) => {
        if (images && images.photos.length > 0) {
          images.photos.forEach((image) => {
            this.handleImageSelection(image.webPath);
          });
          console.log(this.files.map((f) => f.uri));
        }
      })
      .catch((err) => {
        console.error('Error selecting images from gallery:', err);
      });
  }

  handleImageSelection(imageUri: string | undefined) {
    if (!imageUri) {
      console.error('Invalid image URI');
      return;
    }

    if (this.isFileLimitExceeded(1)) {
      this.showFileLimitToast();
    } else {
      this.files.push({ uri: imageUri, caption: '' });
      this.setUpSwiper();
    }
  }

  private setUpSwiper() {
    setTimeout(() => {
      const swiperEl = document.querySelector('swiper-container');
      if (swiperEl) {
        swiperEl.addEventListener('swiperslidechange', (event: any) => {
          this.activeIndex = event.detail[0].activeIndex;
        });

        swiperEl.initialize();
      }
    }, 100);
  }

  onDeleteImage(index: number) {
    this.files.splice(index, 1);
  }

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

  onClose() {
    if (this.displayImages) {
      this.displayImages = false;
    }
    this.files = [];
  }

  showImages(url: string) {
    this.displayImages = true;
    Object.keys(this.groupedMessages).forEach((key) => {
      this.groupedMessages[key].forEach((messageGroup) => {
        messageGroup.forEach((message) => {
          if (message.imageUrl.length === 1) {
            this.files.push({
              uri: message.imageUrl[0],
              caption: message.content,
            });
          } else if (message.imageUrl.length > 3) {
            const images = message.imageUrl.map((url) => {
              return {
                uri: url,
              };
            });
          }
        });
      });
    });

    this.activeIndex = this.files.findIndex((f) => f.uri === url);

    setTimeout(() => {
      const swiperEl = document.querySelector('swiper-container');
      if (swiperEl) {
        // console.log('test');
        // swiperEl.swiper?.slideTo(this.activeIndex, 1, false);
        const params: SwiperOptions = {
          injectStyles: [
            `
          .swiper-pagination-bullet {
            width: 8px;
            height: 8px;
            color: #000;
            opacity: 1;
            background: rgba(0, 0, 0, 0.2);
          }
    
          .swiper-pagination-bullet-active {
            color: #fff;
            background: #007aff;
          }
          `,
          ],
          initialSlide: this.activeIndex,
          pagination: {
            clickable: true,
            renderBullet: function (index: number, className: string) {
              return '<span class="' + className + '"></span>';
            },
          },
        };

        Object.assign(swiperEl, params);

        swiperEl.initialize();
      }
    }, 100);
  }
}
