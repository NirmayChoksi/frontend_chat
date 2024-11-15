import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import Swiper from 'swiper';
import { register } from 'swiper/element/bundle';
// register Swiper custom elements
register();

@Component({
  selector: 'app-upload-image',
  templateUrl: './upload-image.page.html',
  styleUrls: ['./upload-image.page.scss'],
})
export class UploadImagePage {
  images: any[] = [];
  captions: string[] = [];
  activeIndex = 0;
  showKeyboard = false;

  constructor() {}

  selectImages() {
    const fileInput = document.getElementById('imageInput') as HTMLInputElement;
    fileInput.click();
  }

  pickImage(event: any) {
    Keyboard.addListener('keyboardWillShow', () => {
      this.showKeyboard = true;
    })
    console.log('entered');
    // if(!Capacitor.isPluginAvailable('Camera')) {
    //   console.log('not available')
    //   return
    // }

    // Camera.getPhoto({
    //   quality: 50,
    //   source: CameraSource.Prompt,
    //   correctOrientation: true,
    //   height: 320,
    //   width: 200,
    //   resultType: CameraResultType.Base64
    // }).then(image => {
    //   this.image = image.base64String
    //   console.log('UploadImagePage ~ pickImage ~ image.base64String:', image.base64String);
    // }).catch((error) => {
    //   console.log('error', error);
    //   return false;
    // });

    const input = event.target as HTMLInputElement;
    if (input.files) {
      Array.from(input.files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) {
            this.images.push(reader.result);
            this.captions.push('');
          }
        };
        reader.readAsDataURL(file);
      });
    }

    setTimeout(() => {
      const swiperEl = document.querySelector('swiper-container');

      swiperEl?.addEventListener('swiperslidechange', (event: any) => {
        console.log('slide changed to index:hgh', event.detail[0]);
        console.log('slide changed to index:', event.detail[0].activeIndex);
        this.activeIndex = event.detail[0].activeIndex
      });
    },100);
  }

  onSlideChange(event: any) {
    console.log('called')
    console.log('onSlideChange ~ event:', event);
  }
}
