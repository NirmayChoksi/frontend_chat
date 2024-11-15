import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  userName = 'User 1';
  constructor(private router: Router) {}

  ngOnInit() {
    console.log('Initialized');
  }
  
  onClick() {
    if (!this.userName.length) {
      return;
    }
    this.router.navigate(['/home'], {
      queryParams: { userName: this.userName },
    });
  }
}
