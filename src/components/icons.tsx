import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

type IconProps = { size?: number; color?: string; strokeWidth?: number };
type TabProps = { color: string; focused: boolean };

const stroke = {
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

/** Chick mark used on the sign-in screen. */
export function ChickLogo({ size = 28, color = colors.surface }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 17c0-4 3-8 8-8h3l2-3 1 4c1 1 2 3 2 5 0 3-3 5-8 5H8c-2 0-4-1-4-3z"
        stroke={color}
        strokeWidth={1.8}
        {...stroke}
      />
      <Path d="M10 20v2M14 20v2" stroke={color} strokeWidth={1.8} {...stroke} />
    </Svg>
  );
}

export function HomeTabIcon({ color, focused }: TabProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function StockTabIcon({ color, focused }: TabProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M12 3l9 5-9 5-9-5z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M3 13l9 5 9-5"
        fill="none"
        stroke={color}
        strokeWidth={focused ? 1.8 : 1.6}
        {...stroke}
      />
    </Svg>
  );
}

export function BranchesTabIcon({ color, focused }: TabProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Path
        d="M3 10l2-6h14l2 6z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M4 11h16v9H4z"
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M10 20v-5h4v5"
        fill={focused ? colors.surface : 'none'}
        stroke={focused ? 'none' : color}
        strokeWidth={1.6}
      />
    </Svg>
  );
}

export function MoneyTabIcon({ color, focused }: TabProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      <Rect
        x={3}
        y={6}
        width={18}
        height={13}
        rx={2}
        fill={focused ? color : 'none'}
        stroke={color}
        strokeWidth={1.6}
      />
      <Path
        d="M3 10.5h18M7 15h4"
        stroke={focused ? colors.surface : color}
        strokeWidth={1.6}
        {...stroke}
      />
    </Svg>
  );
}

export function MoreTabIcon({ color, focused }: TabProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24">
      {[
        [4, 4],
        [13.5, 4],
        [4, 13.5],
        [13.5, 13.5],
      ].map(([x, y]) => (
        <Rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={6.5}
          height={6.5}
          rx={1.5}
          fill={focused ? color : 'none'}
          stroke={focused ? 'none' : color}
          strokeWidth={1.6}
        />
      ))}
    </Svg>
  );
}

export function CartIcon({ size = 24, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6h15l-2 9H7L5 3H2" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Circle cx={9} cy={20} r={1.5} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={18} cy={20} r={1.5} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function TruckIcon({ size = 24, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" stroke={color} strokeWidth={strokeWidth} {...stroke} />
      <Circle cx={7} cy={18} r={2} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={17} cy={18} r={2} stroke={color} strokeWidth={strokeWidth} />
    </Svg>
  );
}

export function BarsIcon({ size = 24, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={4} y={11} width={4} height={9} rx={1} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Rect x={10} y={5} width={4} height={15} rx={1} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Rect x={16} y={14} width={4} height={6} rx={1} stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
    </Svg>
  );
}

export function CardIcon({ size = 24, color = colors.ink, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={6} width={18} height={13} rx={2} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M3 10h18M7 15h4" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 18, color = colors.secondary, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

export function ChevronLeftIcon({ size = 24, color = colors.accent, strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

export function PlusIcon({ size = 20, color = colors.surface, strokeWidth = 2.2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function InfoIcon({ size = 18, color = colors.secondary, strokeWidth = 1.8 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 11v5M12 8h.01" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}

export function CheckIcon({ size = 14, color = colors.surface, strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12l5 5L20 7" stroke={color} strokeWidth={strokeWidth} {...stroke} />
    </Svg>
  );
}
