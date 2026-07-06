function cycleBlock(
  baseMinute: number,
  liwScale = 1
): string {
  const lines: string[] = [];
  let sec = 0;

  const push = (label: string, ms: number) => {
    const scaled =
      label.startsWith("LIW") ? Math.round(ms * liwScale) : ms;
    const startMin = baseMinute + Math.floor(sec / 60000);
    const startS = ((sec % 60000) / 1000).toFixed(1);
    const endSec = sec + scaled;
    const endMin = baseMinute + Math.floor(endSec / 60000);
    const endS = ((endSec % 60000) / 1000).toFixed(1);
    lines.push(
      `${label},${scaled},${startMin}:${startS.padStart(4, "0")},${endMin}:${endS.padStart(4, "0")}`
    );
    sec = endSec;
  };

  push("CONT", 120);
  push("IDD", 80);
  push("LEAKAGE", 150);
  push("CAPDETECT", 95);
  push("RANGE_INIT", 180);
  push("RANGE_MEASURE", 220);
  push("RANGE_RESULT", 120);
  push("LIW20C_PO", 240);
  push("LIW20C_NTC", 310);
  push("LIW20C_WL_CENTER", 230);
  push("FFBP_INIT", 90);
  push("NCTSE_CHECK", 110);

  const totalMs = sec;
  const endMin = baseMinute + Math.floor(sec / 60000);
  const endS = ((sec % 60000) / 1000).toFixed(1);
  lines.push(
    `Total time,${totalMs},${baseMinute}:00.0,${endMin}:${endS.padStart(4, "0")}`
  );

  return lines.join("\n");
}

export const TACT_TIME_MOCK_CSV = `Label,DurationMs,StartLocal,EndLocal
${cycleBlock(10, 1)}
${cycleBlock(11, 1)}
${cycleBlock(12, 1)}
${cycleBlock(13, 1)}
${cycleBlock(14, 1.55)}
${cycleBlock(15, 1)}
${cycleBlock(16, 1)}
${cycleBlock(17, 1.2)}`;
