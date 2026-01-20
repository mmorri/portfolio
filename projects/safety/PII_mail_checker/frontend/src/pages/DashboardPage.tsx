import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { findingsApi } from '../api';
import type { Severity } from '../types';

const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: '#4caf50',
  MEDIUM: '#ff9800',
  HIGH: '#f44336',
  CRITICAL: '#9c27b0',
};

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="text.secondary" variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
          </Box>
          <Box sx={{ color, opacity: 0.8 }}>{icon}</Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => findingsApi.getStatistics(7),
    refetchInterval: 30000,
  });

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
        Failed to load statistics: {error instanceof Error ? error.message : 'Unknown error'}
      </Alert>
    );
  }

  const stats = data?.statistics;
  if (!stats) return null;

  const severityData = Object.entries(stats.bySeverity).map(([name, value]) => ({
    name,
    value,
    color: SEVERITY_COLORS[name as Severity],
  }));

  const piiTypeData = Object.entries(stats.byPiiType).map(([name, value]) => ({
    name: name.replace(/([A-Z])/g, ' $1').trim(),
    count: value,
  }));

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Dashboard
      </Typography>
      <Typography color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Last 7 days overview
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total Findings"
            value={stats.total}
            icon={<SecurityIcon sx={{ fontSize: 40 }} />}
            color="#1976d2"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Critical"
            value={stats.bySeverity.CRITICAL || 0}
            icon={<ErrorIcon sx={{ fontSize: 40 }} />}
            color="#9c27b0"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="High Severity"
            value={stats.bySeverity.HIGH || 0}
            icon={<WarningIcon sx={{ fontSize: 40 }} />}
            color="#f44336"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Resolved"
            value={stats.byStatus.RESOLVED || 0}
            icon={<CheckCircleIcon sx={{ fontSize: 40 }} />}
            color="#4caf50"
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Findings by Severity
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Findings by PII Type
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={piiTypeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Findings
              </Typography>
              {stats.recentFindings.length === 0 ? (
                <Typography color="text.secondary">No recent findings</Typography>
              ) : (
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Severity</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentFindings.map((finding) => (
                      <tr key={finding.id}>
                        <td style={{ padding: '8px' }}>{finding.piiType}</td>
                        <td style={{ padding: '8px' }}>
                          <Box
                            component="span"
                            sx={{
                              px: 1,
                              py: 0.5,
                              borderRadius: 1,
                              bgcolor: `${SEVERITY_COLORS[finding.severity]}20`,
                              color: SEVERITY_COLORS[finding.severity],
                              fontWeight: 'medium',
                            }}
                          >
                            {finding.severity}
                          </Box>
                        </td>
                        <td style={{ padding: '8px' }}>{finding.status}</td>
                        <td style={{ padding: '8px' }}>
                          {new Date(finding.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
