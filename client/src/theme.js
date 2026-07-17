import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#0D9488', dark: '#0F766E', light: '#2DD4BF' },
        secondary: { main: '#F97316', dark: '#EA6C0A', light: '#FB923C' },
        background: { default: '#F0FBF8', paper: 'rgba(255, 255, 255, 0.78)' },
        text: { primary: '#0F2027', secondary: '#4A6572' },
        info: { main: '#06B6D4' },
        success: { main: '#0D9488' },
        warning: { main: '#F59E0B' },
        error: { main: '#ef4444' },
        divider: 'rgba(13,148,136,0.12)',
    },
    typography: {
        fontFamily: '"Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif',
        h1: { fontSize: 'clamp(2.2rem,5.5vw,3.4rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.025em', fontFamily: '"Plus Jakarta Sans", sans-serif' },
        h2: { fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', fontFamily: '"Plus Jakarta Sans", sans-serif' },
        h3: { fontSize: '1.45rem', fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif' },
        body1: { fontSize: '1rem', lineHeight: 1.7, color: '#4A6572' },
        body2: { fontSize: '0.9rem', lineHeight: 1.65, color: '#7A9BA8' },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiCssBaseline: {
            styleOverrides: { body: { backgroundColor: '#F0FBF8', color: '#0F2027' } },
        },
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: 9, textTransform: 'none', fontWeight: 700, padding: '10px 22px', fontSize: '0.88rem', fontFamily: '"Plus Jakarta Sans", sans-serif' },
                contained: {
                    background: 'linear-gradient(135deg, #0D9488, #0F766E)',
                    color: '#fff',
                    boxShadow: '0 4px 14px rgba(13,148,136,0.28)',
                    '&:hover': { boxShadow: '0 6px 22px rgba(13,148,136,0.4)', transform: 'translateY(-2px)', background: 'linear-gradient(135deg, #0F9D91, #0D8078)' },
                },
                outlined: {
                    borderColor: 'rgba(13,148,136,0.25)',
                    color: '#0D9488',
                    '&:hover': { borderColor: '#0D9488', backgroundColor: 'rgba(13,148,136,0.06)' },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 10,
                        backgroundColor: 'rgba(255, 255, 255, 0.75)',
                        backdropFilter: 'blur(10px)',
                        '& fieldset': { borderColor: 'rgba(13,148,136,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(13,148,136,0.45)' },
                        '&.Mui-focused fieldset': { borderColor: '#0D9488' },
                    },
                    '& .MuiInputBase-input': { color: '#0F2027' },
                    '& .MuiInputLabel-root': { color: '#7A9BA8' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#0D9488' },
                    '& .MuiFormHelperText-root': { color: '#7A9BA8' },
                },
            },
        },
        MuiSelect: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 10,
                        backgroundColor: 'rgba(255, 255, 255, 0.75)',
                        backdropFilter: 'blur(10px)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: 'rgba(255, 255, 255, 0.78)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.85)',
                    boxShadow: '0 8px 32px rgba(13,148,136,0.06)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 10px 40px rgba(13,148,136,0.06)',
                    border: '1px solid rgba(255,255,255,0.85)',
                    backgroundColor: 'rgba(255, 255, 255, 0.78)',
                    backdropFilter: 'blur(20px)',
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { borderRadius: 8, fontWeight: 600 },
                colorPrimary: { backgroundColor: 'rgba(13,148,136,0.1)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.22)' },
                colorSecondary: { backgroundColor: 'rgba(249,115,22,0.1)', color: '#F97316', border: '1px solid rgba(249,115,22,0.22)' },
            },
        },
        MuiAlert: {
            styleOverrides: {
                standardError: { backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' },
                standardSuccess: { backgroundColor: 'rgba(13,148,136,0.08)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.2)' },
            },
        },
        MuiDivider: {
            styleOverrides: { root: { borderColor: 'rgba(13,148,136,0.1)' } },
        },
    },
});

export default theme;
