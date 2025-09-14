// Basic mock database implementation that simplify reads and writes from json files.
// Should be replaced by a real database.

import fs from "fs";
import path from "path";

const userDataPath = path.join(process.cwd(), "./temp-data/userData.json");
const apiKeyPath = path.join(process.cwd(), "./temp-data/userApiKey.json");

const readJson = (filePath: string): any => {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const fileData = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(fileData);
};

const writeJson = (filePath: string, data: any) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

interface UserData {
  orgId: string;
  address: string;
  userId: string;
  email?: string;
}

interface UserApiKey {
  publicKey: string;
  privateKey: string;
  createdAt: Date;
  activated?: boolean;
}

/**
 * Upsert a user's data and their API key. Removes all other users
 * from the database file to avoid any potential conflicts when
 * it's read by another process.
 *
 * Reads the current database from disk, updates the data,
 * and writes the new state back to disk.
 */
export const upsertUser = (data: UserData, apiKey: UserApiKey) => {
  // Read from disk.
  const usersData = readJson(userDataPath);
  const apiKeyData = readJson(apiKeyPath);

  // Update data.
  usersData[data.orgId] = data;
  const existingKeys = apiKeyData[data.orgId] || [];
  apiKeyData[data.orgId] = [...existingKeys, apiKey];

  // Remove any users other than the current user.
  Object.keys(usersData).forEach((key) => {
    if (key !== data.orgId) {
      delete usersData[key];
    }
  });

  // Write back to disk.
  writeJson(userDataPath, usersData);
  writeJson(apiKeyPath, apiKeyData);
};

/**
 * Retrieve user data for a given organization id.
 */
export const getUser = (orgId: string): UserData | null => {
  const userData = readJson(userDataPath);
  return userData[orgId] ?? null;
};

/**
 * Get the latest API key for a given organization id.
 */
export const getLatestApiKey = (orgId: string): UserApiKey | null => {
  const apiKeyData = readJson(apiKeyPath);
  const keys: UserApiKey[] = apiKeyData[orgId];
  return keys?.[keys.length - 1] ?? null;
};

export const setApiKeyActivated = (orgId: string, apiKey: string): void => {
  const apiKeyData = readJson(apiKeyPath);
  const keys: UserApiKey[] = apiKeyData[orgId];
  const key = keys.find((k) => k.publicKey === apiKey);
  if (!key) {
    throw new Error("API key not found");
  }
  const updatedData = {
    ...apiKeyData,
    [orgId]: keys.map((k) =>
      k.publicKey === apiKey ? { ...k, activated: true } : k,
    ),
  };
  writeJson(apiKeyPath, updatedData);
};