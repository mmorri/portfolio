import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Paper,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { findingsApi } from '../api';
import { SeverityChip, StatusChip } from '../components/common';
import type { FindingStatus } from '../types';

const STATUSES: FindingStatus[] = ['NEW', 'ACKNOWLEDGED', 'REVIEWING', 'RESOLVED', 'FALSE_POSITIVE', 'ESCALATED'];

export function FindingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showContext, setShowContext] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<FindingStatus>('ACKNOWLEDGED');
  const [reviewNotes, setReviewNotes] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['finding', id],
    queryFn: () => findingsApi.getById(id!),
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: (data: { status: FindingStatus; reviewNotes?: string; falsePositive?: boolean }) =>
      findingsApi.updateStatus(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finding', id] });
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      setStatusDialogOpen(false);
    },
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !data?.finding) {
    return (
      <Alert severity="error">
        Finding not found or failed to load
      </Alert>
    );
  }

  const finding = data.finding;

  const handleStatusUpdate = () => {
    updateStatusMutation.mutate({
      status: newStatus,
      reviewNotes: reviewNotes || undefined,
      falsePositive: newStatus === 'FALSE_POSITIVE',
    });
  };

  return (
    <Box>
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate('/alerts')}
        sx={{ mb: 3 }}
      >
        Back to Alerts
      </Button>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {finding.description}
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <SeverityChip severity={finding.severity} />
                    <StatusChip status={finding.status} />
                    <Chip
                      label={finding.piiType}
                      size="small"
                      variant="outlined"
                      icon={<SecurityIcon />}
                    />
                  </Stack>
                </Box>
                <Button
                  variant="contained"
                  onClick={() => setStatusDialogOpen(true)}
                >
                  Update Status
                </Button>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography color="text.secondary" variant="body2">
                    Detected Value (Redacted)
                  </Typography>
                  <Typography variant="body1" fontFamily="monospace" sx={{ mt: 0.5 }}>
                    {finding.redactedValue || 'N/A'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography color="text.secondary" variant="body2">
                    Confidence Score
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {(finding.confidence * 100).toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography color="text.secondary" variant="body2">
                    Detection Method
                  </Typography>
                  <Chip
                    label={finding.detectionMethod}
                    size="small"
                    color={finding.mlEnhanced ? 'primary' : 'default'}
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography color="text.secondary" variant="body2">
                    Match Count
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 0.5 }}>
                    {finding.matchCount}
                  </Typography>
                </Grid>
              </Grid>

              {finding.context && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        Context
                      </Typography>
                      <Button
                        size="small"
                        startIcon={showContext ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        onClick={() => setShowContext(!showContext)}
                      >
                        {showContext ? 'Hide' : 'Reveal'} Content
                      </Button>
                    </Box>
                    <Paper
                      sx={{
                        p: 2,
                        bgcolor: 'grey.100',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        filter: showContext ? 'none' : 'blur(5px)',
                        userSelect: showContext ? 'auto' : 'none',
                      }}
                    >
                      {finding.context}
                    </Paper>
                  </Box>
                </>
              )}

              {finding.reviewNotes && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Review Notes
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      {finding.reviewNotes}
                    </Paper>
                    {finding.reviewedBy && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Reviewed by {finding.reviewedBy.name || finding.reviewedBy.email} on{' '}
                        {finding.reviewedAt && new Date(finding.reviewedAt).toLocaleString()}
                      </Typography>
                    )}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <EmailIcon color="action" />
                <Typography variant="subtitle1" fontWeight="medium">
                  Email Details
                </Typography>
              </Box>
              {finding.email ? (
                <Stack spacing={2}>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Subject
                    </Typography>
                    <Typography variant="body1">{finding.email.subject}</Typography>
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      From
                    </Typography>
                    <Typography variant="body1">{finding.email.from}</Typography>
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      To
                    </Typography>
                    <Typography variant="body1">
                      {finding.email.to?.join(', ') || 'N/A'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Received
                    </Typography>
                    <Typography variant="body1">
                      {new Date(finding.email.receivedAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Typography color="text.secondary">
                  Email details not available
                </Typography>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Timeline
              </Typography>
              <Stack spacing={1}>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Detected
                  </Typography>
                  <Typography variant="body2">
                    {new Date(finding.createdAt).toLocaleString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography color="text.secondary" variant="body2">
                    Last Updated
                  </Typography>
                  <Typography variant="body2">
                    {new Date(finding.updatedAt).toLocaleString()}
                  </Typography>
                </Box>
                {finding.reviewedAt && (
                  <Box>
                    <Typography color="text.secondary" variant="body2">
                      Reviewed
                    </Typography>
                    <Typography variant="body2">
                      {new Date(finding.reviewedAt).toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Finding Status</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={newStatus}
                label="Status"
                onChange={(e) => setNewStatus(e.target.value as FindingStatus)}
              >
                {STATUSES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status.replace('_', ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Review Notes"
              multiline
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add notes about this finding..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleStatusUpdate}
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
