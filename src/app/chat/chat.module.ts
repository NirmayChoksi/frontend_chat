import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ChatPageRoutingModule } from './chat-routing.module';

import { ChatPage } from './chat.page';
import { ImageUploaderDirective } from '../directives/image-uploader.directive';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, ChatPageRoutingModule],
  declarations: [ChatPage, ImageUploaderDirective],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ChatPageModule {}
