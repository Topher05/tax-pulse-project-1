import { readFileSync } from "node:fs";

const reportPath = process.argv[2];
const recognizedRiskCodes = new Set(["0", "1", "2", "3"]);

if (!reportPath) {
  throw new Error("Expected the path to a ZAP JSON report");
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));

function fail(message) {
  throw new Error(`Malformed ZAP JSON report: ${message}`);
}

if (!report || typeof report !== "object" || Array.isArray(report)) {
  fail("report root must be an object");
}

if (!Array.isArray(report.site) || report.site.length === 0) {
  fail("report.site must be a non-empty array");
}

const highAlerts = report.site.flatMap((site, siteIndex) => {
  if (!site || typeof site !== "object" || Array.isArray(site)) {
    fail(`report.site[${siteIndex}] must be an object`);
  }

  if (!Array.isArray(site.alerts)) {
    fail(`report.site[${siteIndex}].alerts must be an array`);
  }

  return site.alerts.map((alert, alertIndex) => {
    if (!alert || typeof alert !== "object" || Array.isArray(alert)) {
      fail(`report.site[${siteIndex}].alerts[${alertIndex}] must be an object`);
    }

    if (typeof alert.riskcode !== "string" || !recognizedRiskCodes.has(alert.riskcode)) {
      fail(
        `report.site[${siteIndex}].alerts[${alertIndex}].riskcode must be one of ${[...recognizedRiskCodes].join(", ")}`,
      );
    }

    return alert;
  });
}).filter((alert) => alert.riskcode === "3");

if (highAlerts.length > 0) {
  console.error(`ZAP reported ${highAlerts.length} High-severity alert(s)`);
  process.exitCode = 1;
} else {
  console.log("ZAP reported no High-severity alerts");
}
