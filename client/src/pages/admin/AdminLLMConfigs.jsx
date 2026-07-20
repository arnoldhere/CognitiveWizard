import { useState, useEffect } from "react";
import {
    Box, Typography, Paper, CircularProgress, TextField,
    Button, Grid, Switch, FormControlLabel, Snackbar, Alert
} from "@mui/material";
import { getLLMConfigs, updateLLMConfig } from "../../services/admin";

export default function AdminLLMConfigs() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const data = await getLLMConfigs();
            setConfigs(data);
        } catch (err) {
            console.error("Failed to load configs", err);
            setToast({ open: true, message: 'Failed to load configs', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (index, field, value) => {
        const newConfigs = [...configs];
        newConfigs[index][field] = value;
        setConfigs(newConfigs);
    };

    const handleSave = async (config) => {
        setSaving(true);
        try {
            await updateLLMConfig(config.task_name, config);
            setToast({ open: true, message: `Config for ${config.task_name} updated successfully`, severity: 'success' });
        } catch (err) {
            console.error("Failed to save config", err);
            setToast({ open: true, message: 'Failed to save config', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Box sx={{ p: 5, textAlign: 'center' }}><CircularProgress /></Box>;

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
                LLM Configurations
            </Typography>

            <Grid container spacing={3}>
                {configs.map((config, i) => (
                    <Grid item xs={12} md={6} key={config.task_name}>
                        <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #eee' }} elevation={0}>
                            <Typography variant="h6" fontWeight="bold" sx={{ mb: 3, textTransform: 'capitalize' }}>
                                Task: {config.task_name}
                            </Typography>
                            <Box sx={{ display: 'grid', gap: 2 }}>
                                <TextField
                                    label="Temperature"
                                    type="number"
                                    inputProps={{ step: 0.1, min: 0, max: 2 }}
                                    value={config.temperature}
                                    onChange={(e) => handleChange(i, 'temperature', parseFloat(e.target.value))}
                                    size="small"
                                />
                                <TextField
                                    label="Max New Tokens"
                                    type="number"
                                    value={config.max_new_tokens}
                                    onChange={(e) => handleChange(i, 'max_new_tokens', parseInt(e.target.value, 10))}
                                    size="small"
                                />
                                <TextField
                                    label="Top P"
                                    type="number"
                                    inputProps={{ step: 0.1, min: 0, max: 1 }}
                                    value={config.top_p || ''}
                                    onChange={(e) => handleChange(i, 'top_p', e.target.value ? parseFloat(e.target.value) : null)}
                                    size="small"
                                    placeholder="Empty for default"
                                />
                                <TextField
                                    label="Top K"
                                    type="number"
                                    value={config.top_k || ''}
                                    onChange={(e) => handleChange(i, 'top_k', e.target.value ? parseInt(e.target.value, 10) : null)}
                                    size="small"
                                    placeholder="Empty for default"
                                />
                                <TextField
                                    label="Model Override"
                                    type="text"
                                    value={config.model_override || ''}
                                    onChange={(e) => handleChange(i, 'model_override', e.target.value || null)}
                                    size="small"
                                    placeholder="Empty for provider default"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={config.use_chat}
                                            onChange={(e) => handleChange(i, 'use_chat', e.target.checked)}
                                        />
                                    }
                                    label="Use Chat Pipeline"
                                />
                                <Button
                                    variant="contained"
                                    onClick={() => handleSave(config)}
                                    disabled={saving}
                                    sx={{ mt: 1 }}
                                >
                                    Save Changes
                                </Button>
                            </Box>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={toast.severity} sx={{ width: '100%' }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
