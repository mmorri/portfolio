import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Paper,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import {
  Email as EmailIcon,
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  OpenInNew as OpenInNewIcon,
  ContentCopy as CopyIcon,
  Cloud as CloudIcon,
  Key as KeyIcon,
  Link as LinkIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { gmailApi } from '../api/gmail';

const SETUP_STEPS = [
  {
    label: 'Create Google Cloud Project',
    instructions: [
      'Go to Google Cloud Console',
      'Click "Select a project" at the top, then "New Project"',
      'Enter a project name (e.g., "PII Monitor")',
      'Click "Create" and wait for the project to be created',
    ],
    link: 'https://console.cloud.google.com/projectcreate',
  },
  {
    label: 'Enable Gmail API',
    instructions: [
      'In Google Cloud Console, go to "APIs & Services" > "Library"',
      'Search for "Gmail API"',
      'Click on "Gmail API" in the results',
      'Click "Enable"',
    ],
    link: 'https://console.cloud.google.com/apis/library/gmail.googleapis.com',
  },
  {
    label: 'Configure OAuth Consent Screen',
    instructions: [
      'Go to "APIs & Services" > "OAuth consent screen"',
      'Select "External" user type (or "Internal" if using Google Workspace)',
      'Fill in the required fields: App name, User support email, Developer email',
      'Click "Save and Continue"',
      'On Scopes page, click "Add or Remove Scopes"',
      'Add: gmail.readonly and userinfo.email',
      'Click "Save and Continue" through the remaining steps',
    ],
    link: 'https://console.cloud.google.com/apis/credentials/consent',
  },
  {
    label: 'Create OAuth Credentials',
    instructions: [
      'Go to "APIs & Services" > "Credentials"',
      'Click "Create Credentials" > "OAuth client ID"',
      'Select "Web application" as the application type',
      'Add a name (e.g., "PII Monitor Web Client")',
      'Under "Authorized redirect URIs", add:',
    ],
    link: 'https://console.cloud.google.com/apis/credentials',
    code: 'http://localhost:3000/api/gmail/callback',
  },
  {
    label: 'Configure Environment Variables',
    instructions: [
      'Copy the Client ID and Client Secret from the credentials you just created',
      'Add them to your backend .env file:',
    ],
    code: `GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback`,
  },
];

export function GmailSetupPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const successParam = searchParams.get('success');
  const errorParam = searchParams.get('error');

  const { data: setupStatus, isLoading, refetch } = useQuery({
    queryKey: ['gmail-setup-status'],
    queryFn: () => gmailApi.getSetupStatus(),
    refetchInterval: successParam ? 2000 : false,
  });

  const connectMutation = useMutation({
    mutationFn: gmailApi.getAuthUrl,
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: gmailApi.disconnectAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-setup-status'] });
    },
  });

  const scanMutation = useMutation({
    mutationFn: ({ accountId, count }: { accountId: string; count: number }) =>
      gmailApi.scanEmails(accountId, count),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['findings'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
  });

  useEffect(() => {
    if (successParam) {
      refetch();
    }
  }, [successParam, refetch]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const isConfigured = setupStatus?.isConfigured;
  const accounts = setupStatus?.accounts || [];

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Gmail Integration
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Connect your Gmail account to automatically scan emails for sensitive information
      </Typography>

      {successParam && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Gmail account connected successfully! Your emails will now be monitored for PII.
        </Alert>
      )}

      {errorParam && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to connect Gmail: {decodeURIComponent(errorParam)}
        </Alert>
      )}

      {accounts.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Connected Accounts
            </Typography>
            <List>
              {accounts.map((account) => (
                <ListItem key={account.id}>
                  <ListItemIcon>
                    <EmailIcon color={account.isActive ? 'primary' : 'disabled'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={account.email}
                    secondary={
                      account.lastSyncAt
                        ? `Last scanned: ${new Date(account.lastSyncAt).toLocaleString()}`
                        : 'Never scanned'
                    }
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={account.isActive ? 'Active' : 'Inactive'}
                        color={account.isActive ? 'success' : 'default'}
                        size="small"
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => scanMutation.mutate({ accountId: account.id, count: 20 })}
                        disabled={scanMutation.isPending || !account.isActive}
                      >
                        {scanMutation.isPending ? 'Scanning...' : 'Scan Now'}
                      </Button>
                      <IconButton
                        edge="end"
                        onClick={() => disconnectMutation.mutate(account.id)}
                        disabled={disconnectMutation.isPending}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            {scanMutation.isSuccess && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Scan complete! Found {scanMutation.data.findingsCreated} potential PII items in{' '}
                {scanMutation.data.scanned} emails.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {isConfigured ? (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <CheckIcon color="success" />
              <Typography variant="h6">Gmail API Configured</Typography>
            </Box>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Your server is configured to connect to Gmail. Click below to connect an account.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<EmailIcon />}
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              {connectMutation.isPending ? 'Redirecting...' : 'Connect Gmail Account'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="warning" sx={{ mb: 4 }}>
          <Typography fontWeight="medium">Gmail API Not Configured</Typography>
          <Typography variant="body2">
            The server is missing Google OAuth credentials. Follow the setup instructions below.
          </Typography>
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Setup Instructions
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Follow these steps to enable Gmail integration:
          </Typography>

          <Stepper activeStep={activeStep} orientation="vertical">
            {SETUP_STEPS.map((step, index) => (
              <Step key={step.label} expanded>
                <StepLabel
                  onClick={() => setActiveStep(index)}
                  sx={{ cursor: 'pointer' }}
                  StepIconComponent={() => (
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: activeStep >= index ? 'primary.main' : 'grey.300',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                      }}
                    >
                      {index === 0 && <CloudIcon fontSize="small" />}
                      {index === 1 && <EmailIcon fontSize="small" />}
                      {index === 2 && <SecurityIcon fontSize="small" />}
                      {index === 3 && <KeyIcon fontSize="small" />}
                      {index === 4 && <LinkIcon fontSize="small" />}
                    </Box>
                  )}
                >
                  <Typography fontWeight="medium">{step.label}</Typography>
                </StepLabel>
                <StepContent>
                  <List dense>
                    {step.instructions.map((instruction, i) => (
                      <ListItem key={i} sx={{ py: 0.5 }}>
                        <ListItemText primary={`${i + 1}. ${instruction}`} />
                      </ListItem>
                    ))}
                  </List>

                  {step.code && (
                    <Paper
                      sx={{
                        p: 2,
                        mt: 2,
                        bgcolor: 'grey.900',
                        color: 'grey.100',
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        position: 'relative',
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => copyToClipboard(step.code!, step.label)}
                        sx={{ position: 'absolute', top: 8, right: 8, color: 'grey.400' }}
                      >
                        <CopyIcon fontSize="small" />
                      </IconButton>
                      {copied === step.label && (
                        <Chip
                          label="Copied!"
                          size="small"
                          color="success"
                          sx={{ position: 'absolute', top: 8, right: 48 }}
                        />
                      )}
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{step.code}</pre>
                    </Paper>
                  )}

                  {step.link && (
                    <Button
                      component={Link}
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      startIcon={<OpenInNewIcon />}
                      sx={{ mt: 2 }}
                    >
                      Open Google Cloud Console
                    </Button>
                  )}

                  <Box sx={{ mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(index + 1)}
                      disabled={index === SETUP_STEPS.length - 1}
                      sx={{ mr: 1 }}
                    >
                      {index === SETUP_STEPS.length - 1 ? 'Done' : 'Next'}
                    </Button>
                    {index > 0 && (
                      <Button onClick={() => setActiveStep(index - 1)}>Back</Button>
                    )}
                  </Box>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      <Accordion sx={{ mt: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="medium">Troubleshooting</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="subtitle2" gutterBottom>
            "Access blocked: This app's request is invalid"
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Make sure the redirect URI in Google Cloud Console exactly matches:{' '}
            <code>http://localhost:3000/api/gmail/callback</code>
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            "Gmail integration not configured"
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            The server is missing the GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment
            variables. Make sure they are set in your .env file and restart the server.
          </Typography>

          <Typography variant="subtitle2" gutterBottom>
            "This app isn't verified"
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            For development, click "Advanced" then "Go to [App Name] (unsafe)". For production,
            you'll need to verify your app with Google.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
