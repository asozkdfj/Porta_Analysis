/**
 * Dev PC에서 현재 브라우저 localStorage(Tact Time 세팅)를 public JSON으로 export.
 * 사용: npm run export:tact-time-default
 * (localhost:3000 dev 서버 실행 + /tact-time 에서 세팅 저장된 상태)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "public", "tact-time-default-stations.json");
const url = process.env.TACT_TIME_EXPORT_URL ?? "http://127.0.0.1:3000/tact-time";
const localAppData = process.env.LOCALAPPDATA ?? "";
const roamingAppData = process.env.APPDATA ?? "";

function browserCandidates() {
  return [
    {
      label: "Cursor Browser",
      executablePath: process.env.BROWSER_PATH,
      userDataDir: process.env.BROWSER_USER_DATA,
    },
    {
      label: "Cursor Browser",
      executablePath: `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
      userDataDir: `${roamingAppData}\\Cursor\\Partitions\\cursor-browser`,
    },
    {
      label: "Chrome",
      executablePath: `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`,
      userDataDir: `${localAppData}\\Google\\Chrome\\User Data`,
    },
    {
      label: "Edge",
      executablePath: `${process.env["ProgramFiles(x86)"]}\\Microsoft\\Edge\\Application\\msedge.exe`,
      userDataDir: `${localAppData}\\Microsoft\\Edge\\User Data`,
    },
    {
      label: "Edge",
      executablePath: `${process.env.ProgramFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
      userDataDir: `${localAppData}\\Microsoft\\Edge\\User Data`,
    },
  ].filter((c) => c.executablePath && c.userDataDir);
}

async function readStoreFromProfile(executablePath, userDataDir) {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    userDataDir,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--profile-directory=Default",
    ],
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });
    await new Promise((r) => setTimeout(r, 1500));
    return await page.evaluate(() =>
      localStorage.getItem("gaia.tactTimeStations.v2")
    );
  } finally {
    await browser.close();
  }
}

function countGroups(parsed) {
  return Object.values(parsed.stations ?? {}).reduce(
    (sum, st) => sum + (st.groups?.length ?? 0),
    0
  );
}

let raw = null;
let foundLabel = "";

for (const profile of browserCandidates()) {
  if (!fs.existsSync(profile.executablePath) || !fs.existsSync(profile.userDataDir)) {
    continue;
  }
  try {
    console.log(`Trying ${profile.label}: ${profile.userDataDir}`);
    const candidate = await readStoreFromProfile(
      profile.executablePath,
      profile.userDataDir
    );
    if (!candidate) continue;
    const parsed = JSON.parse(candidate);
    if (countGroups(parsed) > 0) {
      raw = candidate;
      foundLabel = profile.label;
      break;
    }
  } catch (e) {
    console.warn(`  skip: ${e.message}`);
  }
}

if (!raw) {
  console.error(
    "\nTact Time 세팅을 export하지 못했습니다.\n" +
      "개발 서버에서 /tact-time → Tact Time Setting → 하단 [배포용 기본값 저장] 클릭 후\n" +
      "npm run build:portable 을 실행하세요.\n"
  );
  process.exit(1);
}

const parsed = JSON.parse(raw);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2), "utf8");

console.log(`\nExported from ${foundLabel} → ${outPath}`);
console.log(
  `Stations: ${Object.keys(parsed.stations ?? {}).length}, groups: ${countGroups(parsed)}`
);
