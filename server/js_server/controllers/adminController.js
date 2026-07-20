const { User, ChatSession, LLMConfig } = require("../models");
const logger = require("../utils/logger");

async function getStats(req, res, next) {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { is_active: true } });
    const totalChats = await ChatSession.count();

    res.json({
      totalUsers,
      activeUsers,
      disabledUsers: totalUsers - activeUsers,
      totalChats
    });
  } catch (err) {
    next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'full_name', 'role', 'is_active', 'created_at']
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.is_active = is_active;
    await user.save();
    
    res.json({ success: true, user: { id: user.id, is_active: user.is_active } });
  } catch (err) {
    next(err);
  }
}

async function getLLMConfigs(req, res, next) {
  try {
    const configs = await LLMConfig.findAll();
    res.json(configs);
  } catch (err) {
    next(err);
  }
}

async function updateLLMConfig(req, res, next) {
  try {
    const { task_name } = req.params;
    const { temperature, max_new_tokens, top_p, top_k, model_override, use_chat } = req.body;
    
    let config = await LLMConfig.findByPk(task_name);
    if (!config) {
      config = await LLMConfig.create({ task_name, temperature, max_new_tokens, top_p, top_k, model_override, use_chat });
    } else {
      await config.update({ temperature, max_new_tokens, top_p, top_k, model_override, use_chat });
    }
    
    res.json({ success: true, config });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
  getUsers,
  toggleUserStatus,
  getLLMConfigs,
  updateLLMConfig
};
