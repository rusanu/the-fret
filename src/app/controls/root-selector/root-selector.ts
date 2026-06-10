import { Component } from '@angular/core';
import { ROOT_BUTTONS } from '../../core/pitch';
import { RootSelectorBase } from './root-selector-base';

@Component({
  selector: 'app-root-selector',
  standalone: true,
  templateUrl: './root-selector.html',
  styleUrl: './root-selector.scss'
})
export class RootSelectorComponent extends RootSelectorBase {
  readonly roots = ROOT_BUTTONS;
}
