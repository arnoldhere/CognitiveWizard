import { useState, useEffect } from "react";
import { Grid, Paper, Typography, Box, CircularProgress, Card, CardContent } from "@mui/material";
import { People, ChatBubble, PersonOff } from "@mui/icons-material";
import { getAdminStats } from "../../services/admin";

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await getAdminStats();
                setStats(data);
            } catch (err) {
                console.error("Failed to load stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                <CircularProgress />
            </Box>
        );
    }

    const statCards = [
        { title: "Total Users", value: stats?.totalUsers || 0, icon: <People fontSize="large" />, color: "#4caf50" },
        { title: "Active Users", value: stats?.activeUsers || 0, icon: <People fontSize="large" />, color: "#2196f3" },
        { title: "Disabled Users", value: stats?.disabledUsers || 0, icon: <PersonOff fontSize="large" />, color: "#f44336" },
        { title: "Total Chats", value: stats?.totalChats || 0, icon: <ChatBubble fontSize="large" />, color: "#ff9800" },
    ];

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
                Dashboard
            </Typography>
            
            <Grid container spacing={3}>
                {statCards.map((card, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Card sx={{ borderRadius: 3, boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)" }}>
                            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                                <Box sx={{ 
                                    bgcolor: `${card.color}15`, 
                                    color: card.color, 
                                    p: 2, 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    mr: 2 
                                }}>
                                    {card.icon}
                                </Box>
                                <Box>
                                    <Typography variant="h4" fontWeight="bold">
                                        {card.value}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" fontWeight="500">
                                        {card.title}
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
