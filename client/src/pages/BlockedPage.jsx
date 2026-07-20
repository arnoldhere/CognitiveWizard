import { Box, Typography, Button, Container, Paper } from "@mui/material";
import { ErrorOutlineOutlined } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

export default function BlockedPage() {
    const navigate = useNavigate();

    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
            <Container maxWidth="sm">
                <Paper elevation={3} sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
                    <ErrorOutlineOutlined color="error" sx={{ fontSize: 80, mb: 2 }} />
                    <Typography variant="h4" fontWeight="bold" color="error" gutterBottom>
                        Access Blocked
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
                        Your account has been blocked. Please contact the admin team for further assistance.
                    </Typography>
                    <Button variant="contained" onClick={() => navigate('/login')} size="large">
                        Return to Login
                    </Button>
                </Paper>
            </Container>
        </Box>
    );
}
