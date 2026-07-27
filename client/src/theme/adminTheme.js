import { createTheme } from '@mui/material/styles';

/**
 * CognitiveWizard Admin Theme
 * ===========================
 * Derived from the CognitiveWizard logo: midnight navy, electric blue,
 * cyan starlight, and arcane violet.
 */

const brand = {
    azure: { main: '#148CFF', light: '#56B5FF', dark: '#0666D9' },
    cyan: { main: '#1ED9F2', light: '#71EEFF', dark: '#0BAABD' },
    violet: { main: '#7655F6', light: '#A38CFF', dark: '#5736C8' },
    coral: {
        main: '#FF6B6B',
        light: '#FF9A8B',
        dark: '#E54868',
    },
    navy: { 50: '#F4F8FF', 100: '#DDE9FC', 200: '#B7C8E5', 300: '#859AB9', 400: '#536B91', 500: '#2C4164', 600: '#1B2B48', 700: '#101D35', 800: '#09142A', 900: '#050D1E', 950: '#020716' },
};

const sharedTypography = {
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h4: { fontWeight: 700, letterSpacing: '-0.5px' },
        h5: { fontWeight: 700, letterSpacing: '-0.3px' },
        h6: { fontWeight: 600 },
        body2: { lineHeight: 1.6 },
        button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0.01em' },
    },
};

const sharedShape = { shape: { borderRadius: 12 } };

// ─── Light Theme ──────────────────────────────────────────────────────────────

export const lightAdminTheme = createTheme({
    palette: {
        mode: 'light',
        background: { default: '#F5F9FF', paper: '#FFFFFF' },
        primary: { main: brand.azure.main, light: brand.azure.light, dark: brand.azure.dark, contrastText: '#fff' },
        secondary: { main: brand.violet.main },
        error: { main: '#E54868' },
        warning: { main: brand.violet.main },
        info: { main: brand.azure.main },
        success: { main: brand.cyan.dark },
        text: { primary: brand.navy[700], secondary: brand.navy[300] },
        divider: brand.navy[100],
    },
    ...sharedTypography,
    ...sharedShape,
    components: sharedComponents('light'),
});

// ─── Dark Theme ───────────────────────────────────────────────────────────────

export const darkAdminTheme = createTheme({
    palette: {
        mode: 'dark',
        background: { default: brand.navy[950], paper: brand.navy[900] },
        primary: { main: brand.azure.main, light: brand.azure.light, dark: brand.azure.dark, contrastText: '#fff' },
        secondary: { main: brand.violet.light },
        error: { main: '#FF6369' },
        warning: { main: brand.violet.light },
        info: { main: brand.azure.light },
        success: { main: brand.cyan.light },
        text: { primary: brand.navy[50], secondary: brand.navy[300] },
        divider: 'rgba(176, 176, 200, 0.10)',
    },
    ...sharedTypography,
    ...sharedShape,
    components: sharedComponents('dark'),
});

// ─── Shared Components ────────────────────────────────────────────────────────

function sharedComponents(mode) {
    const isDark = mode === 'dark';
    return {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 20px',
                    boxShadow: 'none',
                    '&:hover': { boxShadow: isDark ? '0 7px 20px rgba(20,140,255,0.32)' : '0 7px 20px rgba(20,140,255,0.22)' },
                },
                contained: {
                    background: `linear-gradient(135deg, ${brand.azure.main} 0%, ${brand.violet.main} 100%)`,
                    '&:hover': { background: `linear-gradient(135deg, ${brand.cyan.main} 0%, ${brand.azure.main} 55%, ${brand.violet.main} 100%)` },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.5)' : '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    border: isDark ? '1px solid rgba(176,176,200,0.08)' : `1px solid ${brand.navy[100]}`,
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: { borderBottom: isDark ? '1px solid rgba(176,176,200,0.08)' : `1px solid ${brand.navy[100]}` },
                head: {
                    color: isDark ? brand.navy[300] : brand.navy[400],
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.70rem',
                    letterSpacing: '0.08em',
                    backgroundColor: isDark ? brand.navy[900] : brand.navy[50],
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(176,176,200,0.18)' : brand.navy[100] },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(176,176,200,0.35)' : brand.navy[200] },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: brand.coral.main },
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    margin: '2px 8px',
                    '&.Mui-selected': {
                        backgroundColor: isDark ? 'rgba(20,140,255,0.16)' : 'rgba(20,140,255,0.09)',
                        color: isDark ? brand.azure.light : brand.azure.dark,
                        '& .MuiListItemIcon-root': { color: isDark ? brand.azure.light : brand.azure.dark },
                        '&:hover': { backgroundColor: isDark ? 'rgba(20,140,255,0.25)' : 'rgba(20,140,255,0.15)' },
                    },
                    '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(20,140,255,0.05)' },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { borderRadius: 6, fontWeight: 600, fontSize: '0.72rem' },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: isDark ? brand.navy[900] : '#FFFFFF',
                    borderRight: isDark ? '1px solid rgba(176,176,200,0.08)' : `1px solid ${brand.navy[100]}`,
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: isDark ? 'rgba(8,8,15,0.85)' : 'rgba(255,255,255,0.88)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: isDark ? '1px solid rgba(176,176,200,0.08)' : `1px solid ${brand.navy[100]}`,
                    boxShadow: 'none',
                    color: isDark ? brand.navy[50] : brand.navy[700],
                },
            },
        },
        MuiSwitch: {
            styleOverrides: {
                switchBase: {
                    '&.Mui-checked': { color: brand.cyan.main },
                    '&.Mui-checked + .MuiSwitch-track': { backgroundColor: brand.cyan.main },
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    background: isDark
                        ? 'radial-gradient(circle at 85% -10%, rgba(20,140,255,0.18), transparent 28%), radial-gradient(circle at 20% 0%, rgba(118,85,246,0.13), transparent 25%), #020716'
                        : 'radial-gradient(circle at 85% -10%, rgba(20,140,255,0.12), transparent 30%), #F5F9FF',
                },
            },
        },
    };
}

// Default export is dark theme
const adminTheme = darkAdminTheme;
export default adminTheme;
