import { readFileSync } from "node:fs";

const reportPath = process.argv[2];

if (!reportPath) {
  throw new Error("Expected the path to a ZAP JSON report");
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));
const sites = Array.isArray(report.site) ? report.site : [];
const highAlerts = sites.flatMap((site) =>
  Array.isArray(site?.alerts) ? site.alerts : [],
).filter((alert) => alert?.riskcode === "3");

if (highAlerts.length > 0) {
  console.error(`ZAP reported ${highAlerts.length} High-severity alert(s)`);
  process.exitCode = 1;
} else {
  console.log("ZAP reported no High-severity alerts");
}
