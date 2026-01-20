import { Chip } from '@mui/material';
import type { ChipProps } from '@mui/material';
import type { FindingStatus } from '../../types';

const statusColors: Record<FindingStatus, ChipProps['color']> = {
  NEW: 'info',
  ACKNOWLEDGED: 'primary',
  REVIEWING: 'warning',
  RESOLVED: 'success',
  FALSE_POSITIVE: 'default',
  ESCALATED: 'error',
};

interface StatusChipProps {
  status: FindingStatus;
  size?: 'small' | 'medium';
}

export function StatusChip({ status, size = 'small' }: StatusChipProps) {
  return (
    <Chip
      label={status.replace('_', ' ')}
      color={statusColors[status]}
      size={size}
      variant="outlined"
    />
  );
}
