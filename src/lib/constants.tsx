import type { ReactElement } from "react";
import {
  Cursor02Icon,
  ThreeFinger05Icon,
  PencilIcon,
  EraserIcon,
  ArrowUpRight01Icon,
  TextIcon,
  StickyNote01Icon,
  Image01Icon,
  AddSquareIcon,
  LassoTool01Icon,
} from "hugeicons-react";

export const CANVAS_MARGIN_RATIO = 0.4;
export const MAX_PREVIEW_LENGTH = 8000;
export const BOARD_Z_INDEX = { overlay: 1000 } as const;

export const TOOL_ICON_MAP: Record<string, ReactElement> = {
  select: <Cursor02Icon size={22} strokeWidth={1.5} />,
  hand: <ThreeFinger05Icon size={22} strokeWidth={1.5} />,
  draw: <PencilIcon size={22} strokeWidth={1.5} />,
  eraser: <EraserIcon size={22} strokeWidth={1.5} />,
  arrow: <ArrowUpRight01Icon size={22} strokeWidth={1.5} />,
  text: <TextIcon size={22} strokeWidth={1.5} />,
  note: <StickyNote01Icon size={22} strokeWidth={1.5} />,
  asset: <Image01Icon size={22} strokeWidth={1.5} />,
  rectangle: <AddSquareIcon size={22} strokeWidth={1.5} />,
  lasso: <LassoTool01Icon size={22} strokeWidth={1.5} />,
};

export const DASHBOARD_PALETTES = [
  { borderColor: 'rgba(139,92,246,0.7)',  gradient: 'linear-gradient(145deg,rgba(109,40,217,0.45),rgba(5,5,15,0.85))' },
  { borderColor: 'rgba(192,38,211,0.7)',  gradient: 'linear-gradient(210deg,rgba(162,28,175,0.45),rgba(5,5,15,0.85))' },
  { borderColor: 'rgba(37,99,235,0.7)',   gradient: 'linear-gradient(165deg,rgba(29,78,216,0.45),rgba(5,5,15,0.85))' },
  { borderColor: 'rgba(79,70,229,0.7)',   gradient: 'linear-gradient(195deg,rgba(67,56,202,0.45),rgba(5,5,15,0.85))' },
  { borderColor: 'rgba(14,165,233,0.7)',  gradient: 'linear-gradient(225deg,rgba(2,132,199,0.45),rgba(5,5,15,0.85))' },
  { borderColor: 'rgba(124,58,237,0.7)',  gradient: 'linear-gradient(180deg,rgba(109,40,217,0.45),rgba(5,5,15,0.85))' },
];
