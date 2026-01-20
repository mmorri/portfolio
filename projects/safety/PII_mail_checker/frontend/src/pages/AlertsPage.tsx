import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Checkbox,
  Button,
  Menu,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { findingsApi } from '../api';
import { SeverityChip, StatusChip } from '../components/common';
import type { FindingStatus, Severity } from '../types';

const STATUSES: FindingStatus[] = ['NEW', 'ACKNOWLEDGED', 'REVIEWING', 'RESOLVED', 'FALSE_POSITIVE', 'ESCALATED'];
const SEVERITIES: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function AlertsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [selected, setSelected] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['findings', page, rowsPerPage, statusFilter, severityFilter],
    queryFn: () =>
      findingsApi.getAll({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter as FindingStatus || undefined,
        severity: severityFilter as Severity || undefined,
      }),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: FindingStatus }) =>
      findingsApi.bulkUpdate(ids, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      setSelected([]);
    },
  });

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(data?.findings.map((f) => f.id) || []);
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkAction = (status: FindingStatus) => {
    if (selected.length > 0) {
      bulkUpdateMutation.mutate({ ids: selected, status });
    }
    setAnchorEl(null);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Failed to load findings: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  const findings = data?.findings || [];
  const pagination = data?.pagination;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Alerts
        </Typography>
        {selected.length > 0 && (
          <Stack direction="row" spacing={1}>
            <Chip label={`${selected.length} selected`} />
            <Button
              variant="outlined"
              size="small"
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              Bulk Actions
            </Button>
          </Stack>
        )}
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <FilterIcon color="action" />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                {STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                value={severityFilter}
                label="Severity"
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                {SEVERITIES.map((severity) => (
                  <MenuItem key={severity} value={severity}>
                    {severity}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {(statusFilter || severityFilter) && (
              <Button
                size="small"
                onClick={() => {
                  setStatusFilter('');
                  setSeverityFilter('');
                  setPage(0);
                }}
              >
                Clear Filters
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && selected.length < findings.length}
                    checked={findings.length > 0 && selected.length === findings.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Severity</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Email Subject</TableCell>
                <TableCell>From</TableCell>
                <TableCell>Detected</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {findings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No findings found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                findings.map((finding) => (
                  <TableRow
                    key={finding.id}
                    hover
                    selected={selected.includes(finding.id)}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/alerts/${finding.id}`)}
                  >
                    <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.includes(finding.id)}
                        onChange={() => handleSelect(finding.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={finding.piiType} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <SeverityChip severity={finding.severity} />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={finding.status} />
                    </TableCell>
                    <TableCell>
                      {finding.email?.subject || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {finding.email?.from || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {new Date(finding.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <IconButton size="small" onClick={() => navigate(`/alerts/${finding.id}`)}>
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {pagination && (
          <TablePagination
            component="div"
            count={pagination.total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        )}
      </Card>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleBulkAction('ACKNOWLEDGED')}>
          Mark as Acknowledged
        </MenuItem>
        <MenuItem onClick={() => handleBulkAction('RESOLVED')}>
          Mark as Resolved
        </MenuItem>
        <MenuItem onClick={() => handleBulkAction('FALSE_POSITIVE')}>
          Mark as False Positive
        </MenuItem>
      </Menu>
    </Box>
  );
}
