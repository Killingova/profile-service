type Labels = Record<string, string>;

const counters = new Map<string, number>();
const histogramBuckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5];
const histogram = new Map<string, { count: number; sum: number; buckets: number[] }>();

function metricKey(name: string, labels?: Labels): string {
  if (!labels || Object.keys(labels).length === 0) {
    return name;
  }

  const parts = Object.keys(labels)
    .sort()
    .map((key) => `${key}=${labels[key]}`)
    .join(",");

  return `${name}{${parts}}`;
}

function escapeLabel(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\"/g, '\\"');
}

function formatLabels(labels?: Labels): string {
  if (!labels || Object.keys(labels).length === 0) {
    return "";
  }

  const body = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}="${escapeLabel(value)}"`)
    .join(",");

  return `{${body}}`;
}

export function incrementCounter(name: string, labels?: Labels, amount = 1): void {
  const key = metricKey(name, labels);
  counters.set(key, (counters.get(key) ?? 0) + amount);
}

export function observeHistogram(name: string, valueSeconds: number, labels?: Labels): void {
  const key = metricKey(name, labels);
  let existing = histogram.get(key);
  if (!existing) {
    existing = { count: 0, sum: 0, buckets: new Array(histogramBuckets.length).fill(0) };
    histogram.set(key, existing);
  }

  existing.count += 1;
  existing.sum += valueSeconds;

  for (let index = 0; index < histogramBuckets.length; index += 1) {
    if (valueSeconds <= histogramBuckets[index]) {
      existing.buckets[index] += 1;
    }
  }
}

export function recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
  const labels = {
    method,
    route,
    status: String(statusCode),
  };

  incrementCounter("http_requests_total", labels, 1);
  observeHistogram("http_request_duration_seconds", durationMs / 1000, labels);
}

export function recordProfileRead(): void {
  incrementCounter("profile_read_total", undefined, 1);
}

export function recordProfileWrite(ok: boolean): void {
  if (ok) {
    incrementCounter("profile_write_total", undefined, 1);
    return;
  }

  incrementCounter("profile_write_failed_total", undefined, 1);
}

export function renderPrometheusMetrics(): string {
  const lines: string[] = [];

  lines.push("# HELP http_requests_total Total number of HTTP requests.");
  lines.push("# TYPE http_requests_total counter");

  for (const [key, value] of counters.entries()) {
    if (key.startsWith("http_requests_total")) {
      const [name, labelPart] = key.split("{");
      lines.push(`${name}${labelPart ? `{${labelPart}` : ""} ${value}`);
    }
  }

  lines.push("# HELP profile_read_total Total successful profile read operations.");
  lines.push("# TYPE profile_read_total counter");
  lines.push(`profile_read_total ${counters.get("profile_read_total") ?? 0}`);

  lines.push("# HELP profile_write_total Total successful profile write operations.");
  lines.push("# TYPE profile_write_total counter");
  lines.push(`profile_write_total ${counters.get("profile_write_total") ?? 0}`);

  lines.push("# HELP profile_write_failed_total Total failed profile write operations.");
  lines.push("# TYPE profile_write_failed_total counter");
  lines.push(`profile_write_failed_total ${counters.get("profile_write_failed_total") ?? 0}`);

  lines.push("# HELP http_request_duration_seconds HTTP request duration in seconds.");
  lines.push("# TYPE http_request_duration_seconds histogram");

  for (const [key, value] of histogram.entries()) {
    if (!key.startsWith("http_request_duration_seconds")) {
      continue;
    }

    const labelBlock = key.includes("{") ? key.slice(key.indexOf("{") + 1, -1) : "";
    const baseLabels: Labels = {};
    if (labelBlock) {
      for (const pair of labelBlock.split(",")) {
        const [k, v] = pair.split("=");
        baseLabels[k] = v;
      }
    }

    let cumulative = 0;
    for (let index = 0; index < histogramBuckets.length; index += 1) {
      cumulative += value.buckets[index];
      const bucketLabels = { ...baseLabels, le: String(histogramBuckets[index]) };
      lines.push(
        `http_request_duration_seconds_bucket${formatLabels(bucketLabels)} ${cumulative}`,
      );
    }

    lines.push(
      `http_request_duration_seconds_bucket${formatLabels({ ...baseLabels, le: "+Inf" })} ${value.count}`,
    );
    lines.push(`http_request_duration_seconds_sum${formatLabels(baseLabels)} ${value.sum}`);
    lines.push(`http_request_duration_seconds_count${formatLabels(baseLabels)} ${value.count}`);
  }

  return `${lines.join("\n")}\n`;
}
