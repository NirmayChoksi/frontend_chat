import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ImageUploadService {
  private apiUrl = 'https://backend-chat-6wdi.onrender.com:3000/';

  constructor(
    private http: HttpClient,
    private toastController: ToastController
  ) {}

  uploadFile(files: File[]): Observable<{
    message?: string;
    files: string[];
  }> {
    if (files.length > 5) {
      this.toastController
        .create({
          message: 'You can only upload up to 5 files.',
          duration: 2000,
          color: 'danger',
        })
        .then((toast) => toast.present());

      return of({
        files: [],
      });
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file, file.name);
    });

    return this.http.post<{
      message: string;
      files: string[];
    }>(`${this.apiUrl}upload`, formData);
  }

  deleteFile(path: string) {
    const params = new HttpParams().set('imagePath', path);
    return this.http.delete(`${this.apiUrl}delete-file`, { params });
  }
}
