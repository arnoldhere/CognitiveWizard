import { createTheme } from '@mui/material/styles';

/**
 * CognitiveWizard Admin Theme
 * ===========================
 * Primary:    #F26F67 (coral),  #1E1E2C (dark navy)
 * Secondary:  #3B8FF3 (blue),   #34B1AA (teal),  #E0B50F (gold)
 */

const brand = {
    coral:  { main: '#F26F67', light: '#F59A94', dark: '#D14E46' },
    navy:   { 50: '#F0F0F5', 100: '#DCDCE6', 200: '#B0B0C8', 300: '#7A7A9C', 400: '#4A4A6A', 500: '#2E2E40', 600: '#262636', 700: '#1E1E2C', 800: '#161622', 900: '#0E0E18', 950: '#08080F' },
    blue:   { main: '#3B8FF3', light: '#6AABF7', dark: '#2670CC' },
    teal:   { main: '#34B1AA', light: '#5ECEC7', dark: '#238D87' },
    gold:   { main: '#E0B50F', light: '#EDD04A', dark: '#B8940A' },
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
        background: { default: '#F4F4F8', paper: '#FFFFFF' },
        primary: { main: brand.coral.main, light: brand.coral.light, dark: brand.coral.dark, contrastText: '#fff' },
        secondary: { main: brand.blue.main },
        error: { main: '#E5484D' },
        warning: { main: brand.gold.main },
        info: { main: brand.blue.main },
        success: { main: brand.teal.main },
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
        primary: { main: brand.coral.main, light: brand.coral.light, dark: brand.coral.dark, contrastText: '#fff' },
        secondary: { main: brand.blue.light },
        error: { main: '#FF6369' },
        warning: { main: brand.gold.light },
        info: { main: brand.blue.light },
        success: { main: brand.teal.light },
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
                    '&:hover': { boxShadow: isDark ? '0 4px 14px rgba(242,111,103,0.35)' : '0 4px 14px rgba(242,111,103,0.25)' },
                },
                contained: {
                    background: `linear-gradient(135deg, ${brand.coral.main} 0%, ${brand.coral.dark} 100%)`,
                    '&:hover': { background: `linear-gradient(135deg, ${brand.coral.light} 0%, ${brand.coral.main} 100%)` },
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
                        backgroundColor: isDark ? 'rgba(242,111,103,0.14)' : 'rgba(242,111,103,0.08)',
                        color: isDark ? brand.coral.light : brand.coral.dark,
                        '& .MuiListItemIcon-root': { color: isDark ? brand.coral.light : brand.coral.dark },
                        '&:hover': { backgroundColor: isDark ? 'rgba(242,111,103,0.22)' : 'rgba(242,111,103,0.14)' },
                    },
                    '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(242,111,103,0.05)' },
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
                    '&.Mui-checked': { color: brand.teal.main },
                    '&.Mui-checked + .MuiSwitch-track': { backgroundColor: brand.teal.main },
                },
            },
        },
    };
}

// Default export is dark theme
const adminTheme = darkAdminTheme;
export default adminTheme;
