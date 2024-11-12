import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import io from 'socket.io-client';
import { ImageUploadService } from '../services/image-upload.service';

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
  messages: any[] = [];
  showTyping = false;
  typingTimeout: any;
  fileType = 'image/jpeg';
  files: string[] = [];
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastController: ToastController,
    private imageUploadService: ImageUploadService
  ) {}

  ngOnInit() {
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

  initialSocket = () => {
    this.socket = io('http://localhost:3000', {
      query: { userId: this.sender },
    });

    this.socket.on('connect', () => {
      console.log('Connected to server', this.socket);
    });

    this.getMessages();

    this.socket.on('message_history', (messages: any[]) => {
      this.messages = messages; // Gets message history with the selected user
    });

    this.socket.on('private_message', (message: any) => {
      this.messages.push(message); //gets the created private message
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
    this.socket.emit('send_private_message', {
      from: this.sender,
      to: this.receiver,
      content: this.message,
      imageUrl: 'src\\uploads\\chat\\2024-11-08T11-29-02.837Z - 2.jpg',
    }); // send private message
    this.message = '';
    this.onTyping();
  };

  deleteMessage = (message: any) => {
    this.socket.emit('delete_message', { message, userId: this.sender });
  };

  onDropFiles(files: string[]): void {
    if (files.length + this.files.length > 5) {
      this.toastController
        .create({
          message: 'You can only upload up to 5 files.',
          duration: 2000,
          color: 'danger',
        })
        .then((toast) => toast.present());
      return;
    }
    this.files.push(...files);
    console.log(this.files);
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input && input.files) {
      const files = Array.from(input.files);
      if (files.length > 0) {
        this.imageUploadService.uploadFile(files).subscribe({
          next: (response) => {
            if (response.files.length + this.files.length > 5) {
              this.toastController
                .create({
                  message: 'You can only upload up to 5 files.',
                  duration: 2000,
                  color: 'danger',
                })
                .then((toast) => toast.present());
              return;
            }
            this.files.push(...response.files);
            console.log(this.files);
          },
          error: (error) => {
            console.error('File upload failed', error);
          },
        });
      }
    }
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
}
