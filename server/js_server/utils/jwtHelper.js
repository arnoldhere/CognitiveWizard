const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET_KEY || "cogwiz";
const JWT_ALGORITHM = process.env.JWT_ALGORITHM || "HS256";
const ACCESS_TOKEN_EXPIRE_MINUTES = parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || "60", 10);

function generateToken(user) {
  const payload = {
    sub: user.email,
    id: user.id,
    role: user.role
  };
  
  const secret = user.role === 'admin' ? (process.env.ADMIN_JWT_SECRET_KEY || JWT_SECRET + "_admin") : JWT_SECRET;
  
  return jwt.sign(payload, secret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: `${ACCESS_TOKEN_EXPIRE_MINUTES}m`
  });
}

module.exports = { generateToken };
