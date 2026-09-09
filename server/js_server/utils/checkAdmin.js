const bcrypt = require("bcrypt");
const User = require("../models/User");
const logger = require("../utils/logger");

async function initializeAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass = process.env.ADMIN_PASS;

  if (!adminEmail || !adminPass) {
    logger.warn("[ADMIN_INIT] ADMIN_EMAIL or ADMIN_PASS is not configured in environment. Skipping admin verification.");
    return { success: false, reason: "missing_credentials" };
  }

  try {
    // Ensure table exists on cold-start
    await User.sync();

    const exists = await User.findOne({
      where: {
        email: adminEmail
      }
    });

    if (exists) {
      const needsUpdate = exists.role !== "admin" || !exists.is_active;
      if (needsUpdate) {
        await exists.update({
          role: "admin",
          is_active: true
        });
        logger.info(`[ADMIN_INIT] Admin user existed with incorrect role/status. Updated to admin role and active status (${adminEmail}).`);
        return { success: true, action: "updated", email: adminEmail };
      }

      logger.info(`[ADMIN_INIT] Admin user verified: ${adminEmail} (role: admin, active: true).`);
      return { success: true, action: "verified", email: adminEmail };
    }

    logger.info(`[ADMIN_INIT] Admin user not found. Creating default admin user (${adminEmail})...`);
    const password = await bcrypt.hash(adminPass, 10);

    await User.create({
      full_name: "Admin",
      email: adminEmail,
      hashed_password: password,
      role: "admin",
      is_active: true,
    });

    logger.info(`[ADMIN_INIT] Admin user created successfully (${adminEmail}).`);
    return { success: true, action: "created", email: adminEmail };
  } catch (err) {
    logger.error("[ADMIN_INIT] Failed to initialize or verify admin user.", {
      error: err.message,
    });
    return { success: false, error: err.message };
  }
}

module.exports = initializeAdmin;