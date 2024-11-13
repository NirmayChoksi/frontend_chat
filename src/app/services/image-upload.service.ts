import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { catchError, Observable, of } from 'rxjs';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class ImageUploadService {
  private apiUrl = 'https://backend-chat-6wdi.onrender.com/';

  constructor(
    private http: HttpClient,
    private toastController: ToastController,
    private toastService: ToastService
  ) {}

  uploadFile(files: File[]): Observable<{
    message?: string;
    files: string[];
  }> {
    if (files.length > 5) {
      this.toastService.showToast({
        message: 'You can only upload up to 5 files.',
        duration: 2000,
        color: 'danger',
      });
      return of({
        files: [],
      });
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file, file.name);
    });

    return this.http
      .post<{ message: string; files: string[] }>(
        `${this.apiUrl}upload`,
        formData
      )
      .pipe(
        catchError((error) => {
          this.toastService.showToast({
            message: 'File upload failed. Please try again.',
            duration: 2000,
            color: 'danger',
          });
          return of({ files: [] });
        })
      );
  }

  deleteFile(path: string): Observable<any> {
    const params = new HttpParams().set('imagePath', path);
    return this.http.delete(`${this.apiUrl}delete-file`, { params }).pipe(
      catchError((error) => {
        this.toastService.showToast({
          message: 'File deletion failed. Please try again.',
          duration: 2000,
          color: 'danger',
        });
        return of(null);
      })
    );
  }
}
