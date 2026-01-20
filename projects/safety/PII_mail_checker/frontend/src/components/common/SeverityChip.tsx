import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import type { Severity } from '../../types';

const severityColors: Record<Severity, ChipProps['color']> = {
  LOW: 'success',
  MEDIUM: 'warning',
  HIGH: 'error',
  CRITICAL: 'error',
};

interface SeverityChipProps {
  severity: Severity;
  size?: 'small' | 'medium';
}

export function SeverityChip({ severity, size = 'small' }: SeverityChipProps) {
  return (
    <Chip
      label={severity}
      color={severityColors[severity]}
      size={size}
      variant={severity === 'CRITICAL' ? 'filled' : 'outlined'}
    />
  );
}
