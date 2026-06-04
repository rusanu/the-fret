import { Component } from '@angular/core';
import { FretboardComponent } from './fretboard/fretboard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FretboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
