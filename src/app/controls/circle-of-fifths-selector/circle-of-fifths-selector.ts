import { Component } from '@angular/core';
import { CIRCLE_OF_FIFTHS_ORDER, ROOT_BUTTONS } from '../../core/pitch';
import { RootSelectorBase } from '../root-selector/root-selector-base';

interface CircleSegment {
  pc: number;
  dual: boolean;
  lines: string[];     // 1 line for naturals, 2 lines (e.g. ['C#', 'Db']) for accidentals
  path: string;        // SVG path for the donut-slice button
  labelX: number;
  labelY: number;
}

const CENTER = 100;
const RADIUS_OUTER = 95;
const RADIUS_INNER = 55;
const RADIUS_LABEL = (RADIUS_OUTER + RADIUS_INNER) / 2;
const SEGMENT_GAP_DEG = 3; // visual gap between adjacent segments

function polarToCartesian(radius: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg - 90) * (Math.PI / 180); // 0deg = 12 o'clock, clockwise
  return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

function donutSlicePath(startAngle: number, endAngle: number): string {
  const outerStart = polarToCartesian(RADIUS_OUTER, endAngle);
  const outerEnd = polarToCartesian(RADIUS_OUTER, startAngle);
  const innerStart = polarToCartesian(RADIUS_INNER, endAngle);
  const innerEnd = polarToCartesian(RADIUS_INNER, startAngle);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${RADIUS_OUTER} ${RADIUS_OUTER} 0 0 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${RADIUS_INNER} ${RADIUS_INNER} 0 0 1 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

@Component({
  selector: 'app-circle-of-fifths-selector',
  standalone: true,
  templateUrl: './circle-of-fifths-selector.html',
  styleUrl: './circle-of-fifths-selector.scss'
})
export class CircleOfFifthsSelectorComponent extends RootSelectorBase {
  readonly segments: CircleSegment[] = CIRCLE_OF_FIFTHS_ORDER.map((pc, index) => {
    const root = ROOT_BUTTONS.find(r => r.pc === pc)!;
    const centerAngle = index * 30;
    const halfGap = SEGMENT_GAP_DEG / 2;
    const label = polarToCartesian(RADIUS_LABEL, centerAngle);
    return {
      pc,
      dual: root.dual,
      lines: root.dual ? root.name.split('/') : [root.name],
      path: donutSlicePath(centerAngle - 15 + halfGap, centerAngle + 15 - halfGap),
      labelX: label.x,
      labelY: label.y,
    };
  });
}
