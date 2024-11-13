import { Injectable } from '@angular/core';
import { ToastController, ToastOptions } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  constructor(private toastController: ToastController) {}

  showToast(options: ToastOptions) {
    this.toastController
      .create({ ...options, position: 'top' })
      .then((toast) => toast.present());
  }
}
