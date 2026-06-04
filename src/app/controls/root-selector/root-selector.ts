import { Component, EventEmitter, Output } from '@angular/core';

interface RootButton { name: string; pc: number; }

@Component({
  selector: 'app-root-selector',
  standalone: true,
  templateUrl: './root-selector.html',
  styleUrl: './root-selector.scss'
})
export class RootSelectorComponent {
  @Output() rootSelected = new EventEmitter<number | null>();

  readonly roots: RootButton[] = [
    { name: 'C',  pc: 0  }, { name: 'C#', pc: 1  }, { name: 'D',  pc: 2  },
    { name: 'Eb', pc: 3  }, { name: 'E',  pc: 4  }, { name: 'F',  pc: 5  },
    { name: 'F#', pc: 6  }, { name: 'G',  pc: 7  }, { name: 'Ab', pc: 8  },
    { name: 'A',  pc: 9  }, { name: 'Bb', pc: 10 }, { name: 'B',  pc: 11 }
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
