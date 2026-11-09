import type { FC } from 'react';
import type { PixelMatrix } from '../sprites';

interface PixelRendererProps {
  matrix: PixelMatrix;
  pixelSize?: number; // size of each pixel dot in px
  darkColor?: string;
  lightColor?: string;
  className?: string;
}

export const PixelRenderer: FC<PixelRendererProps> = ({
  matrix,
  pixelSize = 3,
  darkColor = '#242926',
  lightColor = 'transparent',
  className = ''
}) => {
  if (!matrix || matrix.length === 0) return null;
  const rows = matrix.length;
  const cols = matrix[0].length;
  const width = cols * pixelSize;
  const height = rows * pixelSize;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${cols} ${rows}`}
      className={`pixelated ${className}`}
      shapeRendering="crispEdges"
    >
      {matrix.map((row, rIdx) =>
        row.map((val, cIdx) => (
          <rect
            key={`${rIdx}-${cIdx}`}
            x={cIdx}
            y={rIdx}
            width={1}
            height={1}
            fill={val === 1 ? darkColor : lightColor}
          />
        ))
      )}
    </svg>
  );
};
