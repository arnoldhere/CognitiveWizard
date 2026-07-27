import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: { main: '#148CFF', dark: '#0666D9', light: '#1ED9F2' },
        secondary: { main: '#7655F6', dark: '#5736C8', light: '#A38CFF' },
        background: { default: '#F5F9FF', paper: 'rgba(255, 255, 255, 0.78)' },
        text: { primary: '#07152E', secondary: '#4D6486' },
        info: { main: '#1ED9F2' },
        success: { main: '#0BAABD' },
        warning: { main: '#A38CFF' },
        error: { main: '#ef4444' },
        divider: 'rgba(20, 140, 255,0.12)',
    },
    typography: {
        fontFamily: '"Plus Jakarta Sans", Inter, system-ui, -apple-system, sans-serif',
        h1: { fontSize: 'clamp(2.2rem,5.5vw,3.4rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.025em', fontFamily: '"Plus Jakarta Sans", sans-serif' },
        h2: { fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', fontFamily: '"Plus Jakarta Sans", sans-serif' },
        h3: { fontSize: '1.45rem', fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif' },
        body1: { fontSize: '1rem', lineHeight: 1.7, color: '#4D6486' },
        body2: { fontSize: '0.9rem', lineHeight: 1.65, color: '#7187A9' },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    backgroundColor: '#F5F9FF',
                    backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(20,140,255,0.13), transparent 30%), radial-gradient(circle at 100% 8%, rgba(118,85,246,0.10), transparent 26%), radial-gradient(circle at 80% 100%, rgba(30,217,242,0.10), transparent 30%)',
                    backgroundAttachment: 'fixed',
                    color: '#07152E',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: 9, textTransform: 'none', fontWeight: 700, padding: '10px 22px', fontSize: '0.88rem', fontFamily: '"Plus Jakarta Sans", sans-serif' },
                contained: {
                    background: 'linear-gradient(135deg, #148CFF, #0666D9)',
                    color: '#fff',
                    boxShadow: '0 4px 14px rgba(20, 140, 255,0.28)',
                    '&:hover': { boxShadow: '0 7px 24px rgba(20, 140, 255,0.4)', transform: 'translateY(-2px)', background: 'linear-gradient(135deg, #1ED9F2, #148CFF 54%, #7655F6)' },
                },
                outlined: {
                    borderColor: 'rgba(20, 140, 255,0.25)',
                    color: '#148CFF',
                    '&:hover': { borderColor: '#148CFF', backgroundColor: 'rgba(20, 140, 255,0.06)' },
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
                        '& fieldset': { borderColor: 'rgba(20, 140, 255,0.2)' },
                        '&:hover fieldset': { borderColor: 'rgba(20, 140, 255,0.45)' },
                        '&.Mui-focused fieldset': { borderColor: '#148CFF' },
                    },
                    '& .MuiInputBase-input': { color: '#07152E' },
                    '& .MuiInputLabel-root': { color: '#7187A9' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#148CFF' },
                    '& .MuiFormHelperText-root': { color: '#7187A9' },
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
                    boxShadow: '0 8px 32px rgba(20, 140, 255,0.06)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 10px 40px rgba(20, 140, 255,0.06)',
                    border: '1px solid rgba(255,255,255,0.85)',
                    backgroundColor: 'rgba(255, 255, 255, 0.78)',
                    backdropFilter: 'blur(20px)',
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 20,
                    border: '1px solid rgba(20, 140, 255, 0.18)',
                    boxShadow: '0 24px 80px rgba(7, 21, 46, 0.18)',
                },
            },
        },
        MuiTabs: {
            styleOverrides: {
                indicator: { height: 3, borderRadius: 3, background: 'linear-gradient(90deg, #148CFF, #1ED9F2)' },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                bar: { background: 'linear-gradient(90deg, #148CFF, #1ED9F2, #7655F6)' },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { borderRadius: 8, fontWeight: 600 },
                colorPrimary: { backgroundColor: 'rgba(20, 140, 255,0.1)', color: '#148CFF', border: '1px solid rgba(20, 140, 255,0.22)' },
                colorSecondary: { backgroundColor: 'rgba(118, 85, 246,0.1)', color: '#7655F6', border: '1px solid rgba(118, 85, 246,0.22)' },
            },
        },
        MuiAlert: {
            styleOverrides: {
                standardError: { backgroundColor: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.2)' },
                standardSuccess: { backgroundColor: 'rgba(20, 140, 255,0.08)', color: '#148CFF', border: '1px solid rgba(20, 140, 255,0.2)' },
            },
        },
        MuiDivider: {
            styleOverrides: { root: { borderColor: 'rgba(20, 140, 255,0.1)' } },
        },
    },
});

export default theme;
