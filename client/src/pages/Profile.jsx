import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getQuizResults } from "../services/api";
import QuizResultsHistory from "../components/quiz/QuizResultsHistory";
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Avatar,
    Chip,
    Divider,
    Alert,
    Tab,
    Tabs,
} from "@mui/material";
import { Person, Email, AdminPanelSettings, History } from "@mui/icons-material";

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

export default function Profile() {
    const { user } = useAuth();
    const [tabValue, setTabValue] = useState(0);
    const [results, setResults] = useState({ data: [], total: 0, pages: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFetchResults = async (params) => {
        try {
            setLoading(true);
            setError(null);
            const data = await getQuizResults(params);
            setResults(data);
        } catch (err) {
            console.error("Error fetching results:", err);
            setError("Failed to fetch quiz results");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tabValue === 1) {
            handleFetchResults();
        }
    }, [tabValue]);

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    borderBottom: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Tabs
                    value={tabValue}
                    onChange={(event, newValue) => setTabValue(newValue)}
                    sx={{ px: 3 }}
                >
                    <Tab label="Account Details" icon={<Person />} iconPosition="start" />
                    <Tab
                        label={`Quiz History (${results.total || 0})`}
                        icon={<History />}
                        iconPosition="start"
                    />
                </Tabs>
            </Paper>

            {/* Account Details Tab */}
            <TabPanel value={tabValue} index={0}>
                <Paper
                    elevation={2}
                    sx={{
                        p: 4,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <Avatar
                            sx={{
                                width: 80,
                                height: 80,
                                bgcolor: 'primary.main',
                                mr: 3,
                                fontSize: '2rem',
                            }}
                        >
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                            <Typography
                                variant="overline"
                                sx={{
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    letterSpacing: 1,
                                }}
                            >
                                Profile
                            </Typography>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                                Account details
                            </Typography>
                            <Chip
                                label={user.role}
                                icon={<AdminPanelSettings />}
                                color={user.role === 'admin' ? 'secondary' : 'primary'}
                                variant="outlined"
                            />
                        </Box>
                    </Box>

                    <Divider sx={{ my: 3 }} />

                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Email sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Email
                                </Typography>
                            </Box>
                            <Typography variant="body1" color="text.secondary">
                                {user.email}
                            </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Person sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Full Name
                                </Typography>
                            </Box>
                            <Typography variant="body1" color="text.secondary">
                                {user.full_name || "Not provided"}
                            </Typography>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AdminPanelSettings sx={{ mr: 1, color: 'primary.main' }} />
                                <Typography variant="subtitle2" fontWeight={600}>
                                    Role
                                </Typography>
                            </Box>
                            <Typography variant="body1" color="text.secondary">
                                {user.role}
                            </Typography>
                        </Grid>
                    </Grid>
                </Paper>
            </TabPanel>

            {/* Quiz History Tab */}
            <TabPanel value={tabValue} index={1}>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <QuizResultsHistory
                    results={results}
                    loading={loading}
                    onFetchResults={handleFetchResults}
                />
            </TabPanel>
        </Container>
    );
}
