import { cx } from '@/components/ui/cx';

interface ChangeTextProps {
  /** API text that starts with a signed figure, e.g. "+12% higher than other users" or "-3% from last month". */
  change: string;
  /** For spending a rise is bad, so the color flips. The sign in the text always shows the direction. */
  invert?: boolean;
}

/** Colored signed figure followed by its muted label. */
export default function ChangeText({ change, invert = false }: ChangeTextProps) {
  const [figure = '', label = ''] = change.split(/\s+(.+)/);
  const isDown = figure.startsWith('-');
  const isGood = invert ? isDown : !isDown;

  return (
    <span className="text-ui">
      <span className={cx('font-semibold tabular-nums', isGood ? 'text-positive' : 'text-negative-fg')}>{figure}</span>
      {label && <span className="text-muted"> {label}</span>}
    </span>
  );
}
