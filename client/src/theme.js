import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#a855f7', dark: '#7c3aed', light: '#c084fc' },
        secondary: { main: '#06b6d4', dark: '#0891b2', light: '#22d3ee' },
        background: { default: '#0c0e14', paper: '#161b27' },
        text: { primary: '#f1f5f9', secondary: '#94a3b8' },
        info: { main: '#06b6d4' },
        success: { main: '#10b981' },
        warning: { main: '#f59e0b' },
        error: { main: '#ef4444' },
        divider: 'rgba(255,255,255,0.07)',
    },
    typography: {
        fontFamily: 'Inter, Space Grotesk, system-ui, -apple-system, sans-serif',
        h1: { fontSize: 'clamp(2.2rem,5.5vw,3.4rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.025em' },
        h2: { fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' },
        h3: { fontSize: '1.45rem', fontWeight: 700 },
        body1: { fontSize: '1rem', lineHeight: 1.7, color: '#94a3b8' },
        body2: { fontSize: '0.9rem', lineHeight: 1.65, color: '#64748b' },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiCssBaseline: {
            styleOverrides: { body: { backgroundColor: '#0c0e14', color: '#f1f5f9' } },
        },
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: 9, textTransform: 'none', fontWeight: 700, padding: '10px 22px', fontSize: '0.88rem' },
                contained: {
                    background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
                    boxShadow: '0 0 24px rgba(124,58,237,0.4)',
                    '&:hover': { boxShadow: '0 0 36px rgba(124,58,237,0.55)', transform: 'translateY(-2px)' },
                },
                outlined: {
                    borderColor: 'rgba(255,255,255,0.14)',
                    color: '#e2e8f0',
                    '&:hover': { borderColor: '#a855f7', backgroundColor: 'rgba(124,58,237,0.1)' },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 10,
                        backgroundColor: '#10131c',
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                        '&:hover fieldset': { borderColor: 'rgba(168,85,247,0.4)' },
                        '&.Mui-focused fieldset': { borderColor: '#a855f7' },
                    },
                    '& .MuiInputBase-input': { color: '#f1f5f9' },
                    '& .MuiInputLabel-root': { color: '#64748b' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#a855f7' },
                    '& .MuiFormHelperText-root': { color: '#64748b' },
                },
            },
        },
        MuiSelect: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': { borderRadius: 10, backgroundColor: '#10131c' },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: '#161b27',
                    border: '1px solid rgba(255,255,255,0.07)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: { borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.07)' },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { borderRadius: 8, fontWeight: 600 },
                colorPrimary: { backgroundColor: 'rgba(124,58,237,0.18)', color: '#c084fc', border: '1px solid rgba(124,58,237,0.3)' },
                colorSecondary: { backgroundColor: 'rgba(6,182,212,0.12)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.3)' },
            },
        },
        MuiAlert: {
            styleOverrides: {
                standardError: { backgroundColor: 'rgba(239,68,68,0.1)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' },
                standardSuccess: { backgroundColor: 'rgba(16,185,129,0.1)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' },
            },
        },
        MuiDivider: {
            styleOverrides: { root: { borderColor: 'rgba(255,255,255,0.07)' } },
        },
    },
});

export default theme;
