import { createReadStream, existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { recordSiteEvent } from "./db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// B2 credentials come from SOPS-decrypted env vars at runtime.
// Plain .env files are never used in production (see CLAUDE.md rule 7).
// In dev, set these manually or leave unset to skip the upload step.
function getB2Config() {
  const {
    B2_APPLICATION_KEY_ID,
    B2_APPLICATION_KEY,
    B2_BUCKET_NAME,
    B2_ENDPOINT,
  } = process.env;

  if (!B2_APPLICATION_KEY_ID || !B2_APPLICATION_KEY || !B2_BUCKET_NAME) {
    return null; // credentials not configured
  }

  return {
    keyId: B2_APPLICATION_KEY_ID,
    key: B2_APPLICATION_KEY,
    bucket: B2_BUCKET_NAME,
    endpoint: B2_ENDPOINT ?? "https://s3.us-east-005.backblazeb2.com",
  };
}

function makeS3Client(b2Config) {
  return new S3Client({
    endpoint: b2Config.endpoint,
    region: "auto",
    credentials: {
      accessKeyId: b2Config.keyId,
      secretAccessKey: b2Config.key,
    },
    forcePathStyle: true,
  });
}

async function uploadFile(s3, bucket, key, filePath) {
  const stream = createReadStream(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: stream,
    }),
  );
}

// Trigger a HA backup via the backup.create service call and wait for the
// backup manager sensor to return to idle (max 5 minutes).
async function triggerHaBackup(wsClient) {
  await wsClient.callService("backup", "create", {});

  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    const raw = wsClient.getState("sensor.backup_backup_manager_state");
    if (raw?.state === "idle") return true;
    await new Promise((r) => setTimeout(r, 5_000));
  }
  throw new Error("HA backup did not complete within 5 minutes");
}

// Collect the files to include in the B2 backup.
// NOTE: in production these should be encrypted with SOPS/age before upload.
// Encryption is wired during Stage 11 provisioning when the age key is available.
async function collectBackupFiles() {
  const files = [];
  const dbPath =
    process.env.DB_PATH ?? join(__dirname, "..", "data", "ha-core.db");
  if (existsSync(dbPath))
    files.push({ path: dbPath, key: `ha-core/${basename(dbPath)}` });

  const configPath = join(__dirname, "..", "config.json");
  if (existsSync(configPath))
    files.push({ path: configPath, key: "ha-core/config.json" });

  const clientConfigPath =
    process.env.CLIENT_CONFIG_PATH ??
    join(__dirname, "..", "..", "client-app", "client.config.json");
  if (existsSync(clientConfigPath))
    files.push({
      path: clientConfigPath,
      key: "client-app/client.config.json",
    });

  return files;
}

// Run a full backup: trigger HA snapshot, upload files to B2, record result.
// wsClient is optional -- if not connected, HA snapshot step is skipped.
export async function runBackup(wsClient = null) {
  recordSiteEvent("backup_started");
  const started = Date.now();
  const result = {
    haSnapshot: false,
    filesUploaded: [],
    b2Skipped: false,
    error: null,
  };

  try {
    // Step 1: HA snapshot
    if (wsClient?.connected) {
      try {
        await triggerHaBackup(wsClient);
        result.haSnapshot = true;
      } catch (err) {
        // Non-fatal: record but continue so DB/config still gets backed up.
        result.error = `HA snapshot: ${err.message}`;
      }
    }

    // Step 2: upload to B2
    const b2Config = getB2Config();
    if (!b2Config) {
      result.b2Skipped = true;
    } else {
      const s3 = makeS3Client(b2Config);
      const siteId = process.env.SITE_ID ?? "default";
      const datestamp = new Date().toISOString().slice(0, 10);
      const files = await collectBackupFiles();

      for (const { path, key } of files) {
        const b2Key = `sites/${siteId}/${datestamp}/${key}`;
        await uploadFile(s3, b2Config.bucket, b2Key, path);
        result.filesUploaded.push(b2Key);
      }
    }

    const durationMs = Date.now() - started;
    recordSiteEvent("backup_completed", { ...result, durationMs });
    return { ok: true, ...result, durationMs };
  } catch (err) {
    result.error = err.message;
    recordSiteEvent("backup_failed", { error: err.message });
    return { ok: false, ...result };
  }
}
