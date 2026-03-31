const COLORS = ['#2BA89A', '#E9557E', '#7C5CC4', '#D19A00', '#2D9F5E'];

type ShapeType = 'diamond' | 'hexagon' | 'cross';
const SHAPE_TYPES: ShapeType[] = ['diamond', 'hexagon', 'cross'];

const PIECES = Array.from({ length: 30 }, (_, i) => ({
  left: `${5 + (i / 30) * 90}%`,
  size: 8 + (((i * 7 + 3) % 10) / 10) * 8,
  color: COLORS[i % COLORS.length],
  shape: SHAPE_TYPES[i % SHAPE_TYPES.length],
  duration: 1.5 + ((i * 3 + 7) % 10) / 10 * 1.5,
  delay: ((i * 13 + 2) % 10) / 10 * 0.5,
}));

function ConfettiPiece({ size, color, shape }: { size: number; color: string; shape: ShapeType }) {
  switch (shape) {
    case 'diamond':
      return (
        <div style={{
          width: size, height: size,
          backgroundColor: color,
          borderRadius: size * 0.1,
          transform: 'rotate(45deg)',
        }} />
      );
    case 'hexagon':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32">
          <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" fill={color} />
        </svg>
      );
    case 'cross': {
      const arm = size * 0.7;
      const thick = size * 0.3;
      return (
        <div style={{ width: size, height: size, position: 'relative' }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: arm, height: thick, borderRadius: thick / 2,
            backgroundColor: color, transform: 'translate(-50%, -50%)',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: thick, height: arm, borderRadius: thick / 2,
            backgroundColor: color, transform: 'translate(-50%, -50%)',
          }} />
        </div>
      );
    }
  }
}

/**
 * CSS-only confetti burst with geometric shapes.
 * Renders 30 falling pieces using the decorative shape vocabulary.
 * Mount to trigger, unmount to clean up.
 */
export function ConfettiEffect() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" aria-hidden="true">
      {PIECES.map((p, i) => (
        <div
          key={i}
          className="absolute top-0"
          style={{
            left: p.left,
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s both`,
          }}
        >
          <ConfettiPiece size={p.size} color={p.color} shape={p.shape} />
        </div>
      ))}
    </div>
  );
}
