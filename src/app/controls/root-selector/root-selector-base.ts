import { Directive, EventEmitter, Input, Output } from '@angular/core';

@Directive()
export abstract class RootSelectorBase {
  @Input() inSetPcs: Set<number> = new Set();
  @Input() inChordPcs: Set<number> | null = null;
  @Output() rootSelected = new EventEmitter<number | null>();

  @Input() selectedPc: number | null = null;

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
