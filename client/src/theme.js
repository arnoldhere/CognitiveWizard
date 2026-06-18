import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        primary: {
            main: '#206d5f',
            dark: '#11483f',
            light: '#3f8d7f',
        },
        secondary: {
            main: '#d9702f',
            dark: '#9f4c18',
            light: '#f7d9be',
        },
        background: {
            default: '#f7f3ea',
            paper: '#fffdf8',
        },
        text: {
            primary: '#181713',
            secondary: '#686156',
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
                        backgroundColor: '#fffdf8',
                        '& fieldset': {
                            borderColor: '#ded2bc',
                        },
                        '&:hover fieldset': {
                            borderColor: '#c8b99f',
                        },
                        '&.Mui-focused fieldset': {
                            borderColor: '#206d5f',
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
