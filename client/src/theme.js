import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#4f46e5', // Indigo
            dark: '#4338ca',
            light: '#6366f1',
        },
        secondary: {
            main: '#f59e0b', // Amber
            dark: '#d97706',
            light: '#fbbf24',
        },
        background: {
            default: '#f6f7fb',
            paper: '#ffffff',
        },
        text: {
            primary: '#1f2937',
            secondary: '#6b7280',
        },
    },
    typography: {
        fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        h1: {
            fontSize: 'clamp(2.3rem, 4vw, 3.6rem)',
            fontWeight: 700,
            lineHeight: 1.05,
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 600,
        },
        h3: {
            fontSize: '1.5rem',
            fontWeight: 600,
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.6,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 9999,
                    textTransform: 'none',
                    fontWeight: 500,
                    padding: '12px 24px',
                },
                contained: {
                    boxShadow: '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
                    '&:hover': {
                        boxShadow: '0 6px 20px rgba(79, 70, 229, 0.23)',
                    },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 12,
                        backgroundColor: '#f4f5f9',
                        '& fieldset': {
                            borderColor: '#e5e7eb',
                        },
                        '&:hover fieldset': {
                            borderColor: '#d1d5db',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#4f46e5',
                        },
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08)',
                },
            },
        },
    },
});

export default theme;