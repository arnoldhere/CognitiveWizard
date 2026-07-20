import { createTheme } from '@mui/material/styles';

// Shared design tokens
const tokens = {
    indigo: { 50: '#EEF2FF', 100: '#E0E7FF', 400: '#818CF8', 500: '#6366F1', 600: '#4F46E5', 700: '#4338CA' },
    slate: { 50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B', 600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#0F172A', 950: '#020617' },
    emerald: { 400: '#34D399', 500: '#10B981' },
    rose: { 400: '#FB7185', 500: '#F43F5E' },
    amber: { 400: '#FBBF24', 500: '#F59E0B' },
    sky: { 400: '#38BDF8', 500: '#0EA5E9' },
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


export const lightAdminTheme = createTheme({
    palette: {
        mode: 'light',
        background: { default: '#F1F5F9', paper: '#FFFFFF' },
        primary: { main: tokens.indigo[500], light: tokens.indigo[400], dark: tokens.indigo[600], contrastText: '#fff' },
        secondary: { main: tokens.emerald[500] },
        error: { main: tokens.rose[500] },
        warning: { main: tokens.amber[500] },
        info: { main: tokens.sky[500] },
        success: { main: tokens.emerald[500] },
        text: { primary: tokens.slate[900], secondary: tokens.slate[500] },
        divider: tokens.slate[200],
    },
    ...sharedTypography,
    ...sharedShape,
    components: sharedComponents('light'),
});

export const darkAdminTheme = createTheme({
    palette: {
        mode: 'dark',
        background: { default: tokens.slate[950], paper: tokens.slate[900] },
        primary: { main: tokens.indigo[400], light: '#A5B4FC', dark: tokens.indigo[500], contrastText: '#fff' },
        secondary: { main: tokens.emerald[400] },
        error: { main: tokens.rose[400] },
        warning: { main: tokens.amber[400] },
        info: { main: tokens.sky[400] },
        success: { main: tokens.emerald[400] },
        text: { primary: tokens.slate[50], secondary: tokens.slate[400] },
        divider: 'rgba(148, 163, 184, 0.12)',
    },
    ...sharedTypography,
    ...sharedShape,
    components: sharedComponents('dark'),
});


function sharedComponents(mode) {
    const isDark = mode === 'dark';
    return {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '8px 20px',
                    boxShadow: 'none',
                    '&:hover': { boxShadow: isDark ? '0 4px 12px rgba(99,102,241,0.4)' : '0 4px 12px rgba(99,102,241,0.25)' },
                },
                contained: {
                    background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #818CF8 0%, #6366F1 100%)' },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.4)' : '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    border: isDark ? '1px solid rgba(148,163,184,0.08)' : '1px solid rgba(226,232,240,0.8)',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: { borderBottom: isDark ? '1px solid rgba(148,163,184,0.10)' : '1px solid rgba(226,232,240,1)' },
                head: {
                    color: isDark ? tokens.slate[400] : tokens.slate[500],
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    fontSize: '0.70rem',
                    letterSpacing: '0.08em',
                    backgroundColor: isDark ? tokens.slate[900] : tokens.slate[50],
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(148,163,184,0.2)' : tokens.slate[200] },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: isDark ? 'rgba(148,163,184,0.4)' : tokens.slate[300] },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366F1' },
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 10,
                    margin: '2px 8px',
                    '&.Mui-selected': {
                        backgroundColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
                        color: isDark ? '#A5B4FC' : tokens.indigo[600],
                        '& .MuiListItemIcon-root': { color: isDark ? '#A5B4FC' : tokens.indigo[600] },
                        '&:hover': { backgroundColor: isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.15)' },
                    },
                    '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.06)' },
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
                    backgroundColor: isDark ? tokens.slate[900] : '#FFFFFF',
                    borderRight: isDark ? '1px solid rgba(148,163,184,0.08)' : '1px solid rgba(226,232,240,0.8)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: isDark ? 'rgba(2,6,23,0.85)' : 'rgba(255,255,255,0.85)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: isDark ? '1px solid rgba(148,163,184,0.08)' : '1px solid rgba(226,232,240,0.8)',
                    boxShadow: 'none',
                    color: isDark ? tokens.slate[50] : tokens.slate[800],
                },
            },
        },
    };
}

// Default export is dark theme
const adminTheme = darkAdminTheme;
export default adminTheme;
