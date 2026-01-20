import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Chip,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { policyApi } from '../api';
import type { Severity } from '../types';

const PII_TYPES = [
  { id: 'ssn', label: 'Social Security Numbers' },
  { id: 'creditCard', label: 'Credit Cards' },
  { id: 'email', label: 'Email Addresses' },
  { id: 'phone', label: 'Phone Numbers' },
  { id: 'bankAccount', label: 'Bank Accounts' },
];

const SEVERITIES: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [formData, setFormData] = useState({
    enabledPiiTypes: [] as string[],
    confidenceThreshold: 0.8,
    highSeverityScore: 10,
    criticalSeverityScore: 20,
    allowedDomains: '',
    allowedSenders: '',
    emailNotifications: true,
    notifyOnSeverity: 'HIGH' as Severity,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['policy'],
    queryFn: () => policyApi.get(),
  });

  useEffect(() => {
    if (data?.policy) {
      setFormData({
        enabledPiiTypes: data.policy.enabledPiiTypes,
        confidenceThreshold: data.policy.confidenceThreshold,
        highSeverityScore: data.policy.highSeverityScore,
        criticalSeverityScore: data.policy.criticalSeverityScore,
        allowedDomains: data.policy.allowedDomains.join(', '),
        allowedSenders: data.policy.allowedSenders.join(', '),
        emailNotifications: data.policy.emailNotifications,
        notifyOnSeverity: data.policy.notifyOnSeverity,
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: policyApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy'] });
      setSnackbar({ open: true, message: 'Settings saved successfully', severity: 'success' });
    },
    onError: (err) => {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'Failed to save settings',
        severity: 'error',
      });
    },
  });

  const handlePiiTypeToggle = (typeId: string) => {
    setFormData((prev) => ({
      ...prev,
      enabledPiiTypes: prev.enabledPiiTypes.includes(typeId)
        ? prev.enabledPiiTypes.filter((t) => t !== typeId)
        : [...prev.enabledPiiTypes, typeId],
    }));
  };

  const handleSave = () => {
    updateMutation.mutate({
      enabledPiiTypes: formData.enabledPiiTypes,
      confidenceThreshold: formData.confidenceThreshold,
      highSeverityScore: formData.highSeverityScore,
      criticalSeverityScore: formData.criticalSeverityScore,
      allowedDomains: formData.allowedDomains.split(',').map((s) => s.trim()).filter(Boolean),
      allowedSenders: formData.allowedSenders.split(',').map((s) => s.trim()).filter(Boolean),
      emailNotifications: formData.emailNotifications,
      notifyOnSeverity: formData.notifyOnSeverity,
    });
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
        Failed to load settings: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Settings
        </Typography>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                PII Detection
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                Select which types of PII to detect
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {PII_TYPES.map((type) => (
                  <Chip
                    key={type.id}
                    label={type.label}
                    onClick={() => handlePiiTypeToggle(type.id)}
                    color={formData.enabledPiiTypes.includes(type.id) ? 'primary' : 'default'}
                    variant={formData.enabledPiiTypes.includes(type.id) ? 'filled' : 'outlined'}
                  />
                ))}
              </Stack>

              <Divider sx={{ my: 3 }} />

              <Typography variant="subtitle2" gutterBottom>
                Confidence Threshold: {(formData.confidenceThreshold * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={formData.confidenceThreshold}
                onChange={(_, v) => setFormData((prev) => ({ ...prev, confidenceThreshold: v as number }))}
                min={0.5}
                max={1}
                step={0.05}
                marks={[
                  { value: 0.5, label: '50%' },
                  { value: 0.8, label: '80%' },
                  { value: 1, label: '100%' },
                ]}
              />
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Severity Thresholds
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                Configure risk score thresholds for severity levels
              </Typography>

              <Stack spacing={3}>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    High Severity Score: {formData.highSeverityScore}
                  </Typography>
                  <Slider
                    value={formData.highSeverityScore}
                    onChange={(_, v) => setFormData((prev) => ({ ...prev, highSeverityScore: v as number }))}
                    min={5}
                    max={30}
                    step={1}
                  />
                </Box>
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Critical Severity Score: {formData.criticalSeverityScore}
                  </Typography>
                  <Slider
                    value={formData.criticalSeverityScore}
                    onChange={(_, v) => setFormData((prev) => ({ ...prev, criticalSeverityScore: v as number }))}
                    min={10}
                    max={50}
                    step={1}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Allowlists
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
                Exempt specific domains or senders from detection
              </Typography>

              <Stack spacing={3}>
                <TextField
                  label="Allowed Domains"
                  placeholder="example.com, trusted.org"
                  value={formData.allowedDomains}
                  onChange={(e) => setFormData((prev) => ({ ...prev, allowedDomains: e.target.value }))}
                  helperText="Comma-separated list of domains to ignore"
                  fullWidth
                />
                <TextField
                  label="Allowed Senders"
                  placeholder="hr@company.com, admin@trusted.org"
                  value={formData.allowedSenders}
                  onChange={(e) => setFormData((prev) => ({ ...prev, allowedSenders: e.target.value }))}
                  helperText="Comma-separated list of email addresses to ignore"
                  fullWidth
                />
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notifications
              </Typography>

              <Stack spacing={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.emailNotifications}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, emailNotifications: e.target.checked }))
                      }
                    />
                  }
                  label="Enable email notifications"
                />

                <FormControl fullWidth disabled={!formData.emailNotifications}>
                  <InputLabel>Notify on Severity</InputLabel>
                  <Select
                    value={formData.notifyOnSeverity}
                    label="Notify on Severity"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notifyOnSeverity: e.target.value as Severity }))
                    }
                  >
                    {SEVERITIES.map((severity) => (
                      <MenuItem key={severity} value={severity}>
                        {severity} and above
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
