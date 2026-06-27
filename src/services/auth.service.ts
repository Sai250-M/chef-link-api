import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../config/db";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.utils";
import { AppError } from "../middleware/error.middleware";
import { RegisterInput, LoginInput } from "../validators/auth.validator";
import { SafeUser, TokenPair, JwtPayload } from "../types";

const SALT_ROUNDS = 12;

const formatUser = (row: any): SafeUser => ({
  id: row.id,
  email: row.email,
  role: row.role,
  first_name: row.first_name,
  last_name: row.last_name,
  phone: row.phone,
  avatar_url: row.avatar_url,
  is_active: row.is_active,
  is_verified: row.is_verified,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const buildTokenPair = (user: { id: string; role: any; email: string }): TokenPair => {
  const payload: JwtPayload = { userId: user.id, role: user.role, email: user.email };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
};

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

const storeRefreshToken = async (
  userId: string,
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, hashToken(token), expiresAt, ipAddress || null, userAgent || null]
  );
};

const createProfileForRole = async (client: any, userId: string, role: string): Promise<void> => {
  if (role === "ROLE_CHEF") {
    await client.query("INSERT INTO chef_profiles (user_id) VALUES ($1)", [userId]);
  } else if (role === "ROLE_HELPER") {
    await client.query("INSERT INTO helper_profiles (user_id) VALUES ($1)", [userId]);
  } else if (role === "ROLE_RESTAURANT") {
    await client.query(
      "INSERT INTO restaurant_profiles (user_id, name) VALUES ($1, $2)",
      [userId, "My Restaurant"]
    );
  }
};

export const registerUser = async (
  input: RegisterInput,
  ip?: string,
  ua?: string
): Promise<{ user: SafeUser; tokens: TokenPair }> => {
  const existing = await pool.query(
    "SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL",
    [input.email.toLowerCase()]
  );

  if (existing.rows.length > 0) {
    throw new AppError("An account with this email already exists", 409);
  }

  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `INSERT INTO users (email, password_hash, role, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, first_name, last_name, phone, avatar_url,
                 is_active, is_verified, created_at, updated_at`,
      [input.email.toLowerCase(), password_hash, input.role, input.first_name, input.last_name, input.phone || null]
    );

    const user = rows[0];
    await createProfileForRole(client, user.id, user.role);

    const tokens = buildTokenPair(user);

    await client.query("COMMIT");

    await storeRefreshToken(user.id, tokens.refreshToken, ip, ua);

    return { user: formatUser(user), tokens };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const loginUser = async (
  input: LoginInput,
  ip?: string,
  ua?: string
): Promise<{ user: SafeUser; tokens: TokenPair }> => {
  const { rows } = await pool.query(
    `SELECT id, email, password_hash, role, first_name, last_name, phone, avatar_url,
            is_active, is_verified, created_at, updated_at
     FROM users WHERE email = $1 AND deleted_at IS NULL`,
    [input.email.toLowerCase()]
  );

  if (rows.length === 0) {
    throw new AppError("Invalid email or password", 401);
  }

  const user = rows[0];

  if (!user.is_active) {
    throw new AppError("Your account has been deactivated", 403);
  }

  const passwordMatch = await bcrypt.compare(input.password, user.password_hash);
  if (!passwordMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  const tokens = buildTokenPair(user);
  await storeRefreshToken(user.id, tokens.refreshToken, ip, ua);

  return { user: formatUser(user), tokens };
};

export const refreshAccessToken = async (
  refreshToken: string,
  ip?: string,
  ua?: string
): Promise<TokenPair> => {
  let payload: JwtPayload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  const tokenHash = hashToken(refreshToken);
  const { rows } = await pool.query(
    `SELECT id, user_id FROM refresh_tokens
     WHERE token_hash = $1 AND is_revoked = FALSE AND expires_at > NOW()`,
    [tokenHash]
  );

  if (rows.length === 0) {
    throw new AppError("Refresh token not found or already used", 401);
  }

  // Revoke old token (rotation)
  await pool.query("UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1", [rows[0].id]);

  const { rows: userRows } = await pool.query(
    `SELECT id, email, role FROM users WHERE id = $1 AND is_active = TRUE AND deleted_at IS NULL`,
    [payload.userId]
  );

  if (userRows.length === 0) {
    throw new AppError("User not found or deactivated", 401);
  }

  const user = userRows[0];
  const newTokens = buildTokenPair(user);
  await storeRefreshToken(user.id, newTokens.refreshToken, ip, ua);

  return newTokens;
};

export const logoutUser = async (refreshToken: string): Promise<void> => {
  const tokenHash = hashToken(refreshToken);
  await pool.query("UPDATE refresh_tokens SET is_revoked = TRUE WHERE token_hash = $1", [tokenHash]);
};

export const initiatePasswordReset = async (email: string): Promise<string> => {
  const { rows } = await pool.query(
    "SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL",
    [email.toLowerCase()]
  );

  if (rows.length === 0) {
    return "If this email is registered, you will receive reset instructions";
  }

  const userId = rows[0].id;
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt]
  );

  // In production, send email here
  console.log(`[DEV] Password reset token for ${email}: ${token}`);

  return token;
};

export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  const tokenHash = hashToken(token);

  const { rows } = await pool.query(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );

  if (rows.length === 0) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const { id: tokenId, user_id } = rows[0];
  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [password_hash, user_id]);
    await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1", [tokenId]);
    await client.query("UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1", [user_id]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  const { rows } = await pool.query(
    "SELECT password_hash FROM users WHERE id = $1",
    [userId]
  );

  if (rows.length === 0) throw new AppError("User not found", 404);

  const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!match) throw new AppError("Current password is incorrect", 400);

  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [password_hash, userId]);
};
