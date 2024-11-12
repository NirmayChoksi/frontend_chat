import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ToastController } from '@ionic/angular';

import { ImageUploadService } from '../services/image-upload.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  userName = '';
  users: any[] = [
    { name: 'User 1', label: 'User 1' },
    { name: 'User 2', label: 'User 2' },
    { name: 'User 3', label: 'User 3' },
  ];
  filteredUsers: any[] = [];

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe({
      next: (params) => {
        const userName = params.get('userName');
        if (userName) {
          this.userName = userName;
          this.filteredUsers = this.users.filter(
            (user) => user.name !== userName
          );
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (error) => {
        console.error('Error: ', error);
      },
    });
  }

  onChat(user: any) {
    if (this.userName && user.name) {
      this.router.navigate(['/chat'], {
        queryParams: { sender: this.userName, receiver: user.name },
      });
    }
  }
}
