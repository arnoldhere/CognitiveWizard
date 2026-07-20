const bcrypt = require("bcrypt");
const User = require("../models/User");
const logger = require("../utils/logger");

async function initializeAdmin() {
    try {
        const exists = await User.findOne({
            where: {
                email: process.env.ADMIN_EMAIL
            }
        });

        if (exists) {
            logger.info("Admin user already exists.");
            return;
        }

        logger.info("Creating default admin user...");
        const password = await bcrypt.hash(process.env.ADMIN_PASS, 10);

        await User.create({
            full_name: "Admin",
            email: process.env.ADMIN_EMAIL,
            hashed_password: password,
            role: "admin",
        });

        logger.info("Admin user created successfully.");
    } catch (err) {
        logger.error("Failed to initialize admin user.", {
            error: err.message,
        });
    }
}
module.exports = initializeAdmin;