import { Component, EventEmitter, Input, Output } from '@angular/core';

interface RootButton { name: string; pc: number; dual: boolean; }

@Component({
  selector: 'app-root-selector',
  standalone: true,
  templateUrl: './root-selector.html',
  styleUrl: './root-selector.scss'
})
export class RootSelectorComponent {
  @Input() inSetPcs: Set<number> = new Set();
  @Input() inChordPcs: Set<number> | null = null;
  @Output() rootSelected = new EventEmitter<number | null>();

  readonly roots: RootButton[] = [
    { name: 'C',     pc: 0,  dual: false },
    { name: 'C#/Db', pc: 1,  dual: true  },
    { name: 'D',     pc: 2,  dual: false },
    { name: 'Eb/D#', pc: 3,  dual: true  },
    { name: 'E',     pc: 4,  dual: false },
    { name: 'F',     pc: 5,  dual: false },
    { name: 'F#/Gb', pc: 6,  dual: true  },
    { name: 'G',     pc: 7,  dual: false },
    { name: 'Ab/G#', pc: 8,  dual: true  },
    { name: 'A',     pc: 9,  dual: false },
    { name: 'Bb/A#', pc: 10, dual: true  },
    { name: 'B',     pc: 11, dual: false },
  ];

  selectedPc: number | null = null;

  select(pc: number): void {
    if (this.selectedPc === pc) {
      this.selectedPc = null;
      this.rootSelected.emit(null);
    } else {
      this.selectedPc = pc;
      this.rootSelected.emit(pc);
    }
  }
}
