const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_REVIEW_TOKEN = process.env.ADMIN_REVIEW_TOKEN;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESULT_EMAIL_FROM = process.env.RESULT_EMAIL_FROM;
const { randomUUID } = require("crypto");
const { deflateSync } = require("zlib");

function json(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function supabaseHeaders() {
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation"
  };

  if (!String(SUPABASE_SERVICE_ROLE_KEY || "").startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  }

  return headers;
}

function assertConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are not configured.");
  }
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function supabaseRequest(path, options = {}) {
  assertConfigured();
  const headers = {
    ...supabaseHeaders(),
    ...(options.headers || {})
  };
  Object.keys(headers).forEach((key) => {
    if (headers[key] === undefined) delete headers[key];
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.hint || "Supabase request failed.";
    throw new Error(message);
  }

  return data;
}

function validateAttempt(payload) {
  if (!payload || typeof payload !== "object") {
    return "Request body must be an assessment payload.";
  }
  if (!payload.id) return "Attempt id is required.";
  if (!payload.respondent?.name && !payload.respondentLabel) {
    return "Respondent name is required.";
  }
  if (!payload.respondent?.email) {
    return "Respondent email is required.";
  }
  if (!Array.isArray(payload.answers) || !payload.answers.length) {
    return "At least one answer is required.";
  }
  if (!payload.scores || typeof payload.scores !== "object") {
    return "Scores are required.";
  }
  return null;
}

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

function isEmailConfigured() {
  return Boolean(RESEND_API_KEY && RESULT_EMAIL_FROM);
}

async function findRespondentByEmail(email) {
  if (!email) return null;
  const encodedEmail = encodeURIComponent(email);
  const rows = await supabaseRequest(`respondents?email=eq.${encodedEmail}&select=id&limit=1`, {
    method: "GET",
    headers: { Prefer: undefined }
  });
  return rows?.[0]?.id || null;
}

async function createRespondent(payload) {
  const respondent = payload.respondent || {};
  const rows = await supabaseRequest("respondents", {
    method: "POST",
    body: JSON.stringify({
      id: randomUUID(),
      respondent_label: respondent.name || payload.respondentLabel || "Unknown respondent",
      email: respondent.email || null,
      metadata: {
        source: "leadership-assessment",
        first_attempt_id: payload.id
      }
    })
  });
  return rows[0].id;
}

async function upsertRespondent(payload) {
  const email = payload.respondent?.email?.trim() || "";
  const existingId = await findRespondentByEmail(email);
  if (existingId) return existingId;
  return createRespondent(payload);
}

function attemptRow(payload, respondentId) {
  const quality = payload.quality || {};
  return {
    id: payload.id,
    created_at: payload.createdAt || new Date().toISOString(),
    completed_at: new Date().toISOString(),
    respondent_id: respondentId,
    respondent_label: payload.respondent?.name || payload.respondentLabel || null,
    email: payload.respondent?.email || null,
    primary_styles: payload.primaryStyles || [],
    confidence: payload.confidence || "Unclassified",
    is_interpretable: Boolean(quality.isInterpretable && payload.primaryStyles?.length),
    questions_asked: payload.questionsAsked || payload.answers?.length || 0,
    scores: payload.scores || {},
    response_quality: quality,
    straight_line_ratio: quality.straightLineRatio ?? null,
    neutral_ratio: quality.neutralRatio ?? null,
    extreme_ratio: quality.extremeRatio ?? null,
    response_variance: quality.variance ?? null,
    derived_ratio: quality.derivedRatio ?? null,
    result_summary: payload.resultSummary || "",
    full_result: payload
  };
}

function strengthLabel(score) {
  if (score <= -8) return "Low correlation";
  if (score <= -2) return "Low tendency";
  if (score <= 4) return "Moderate tendency";
  if (score <= 10) return "High tendency";
  return "Strong tendency";
}

function answerRows(payload) {
  return payload.answers.map((answer, index) => ({
    attempt_id: payload.id,
    question_id: answer.questionId,
    question_text: answer.text,
    leadership_style: answer.style,
    answer_value: answer.value,
    scored_value: answer.score,
    direction: answer.direction,
    is_derived: Boolean(answer.derived),
    derived_from: answer.derivedFrom || null,
    asked_order: index + 1,
    answered_at: payload.createdAt || new Date().toISOString()
  }));
}

async function saveAttempt(payload) {
  const respondentId = await upsertRespondent(payload);

  await supabaseRequest("assessment_attempts", {
    method: "POST",
    body: JSON.stringify(attemptRow(payload, respondentId))
  });

  await supabaseRequest("assessment_answers", {
    method: "POST",
    body: JSON.stringify(answerRows(payload))
  });

  return { attemptId: payload.id, respondentId };
}

function textResultEmail(payload) {
  const respondentName = payload.respondent?.name || payload.respondentLabel || "there";
  const resultTitle = payload.primaryStyles?.length
    ? `${payload.primaryStyles.join(" + ")} Leadership`
    : "No Leadership Style Assigned";
  const scoreLines = Object.entries(payload.scores || {})
    .sort((a, b) => b[1] - a[1])
    .map(([style, score]) => `${style}: ${payload.scoreLabels?.[style] || strengthLabel(score)}`)
    .join("\n");

  return [
    `Hi ${respondentName},`,
    "",
    "Here are your leadership assessment results.",
    "",
    `Result: ${resultTitle}`,
    "",
    payload.resultSummary || "",
    "",
    "Strength profile:",
    scoreLines,
    "",
    "This assessment is intended for leadership reflection and development. No leadership style is inherently better than another; effective leadership depends on context, adaptability, and the needs of the people being led."
  ].join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function emailRadarPng(payload) {
  const styles = [
    "Autocratic",
    "Charismatic",
    "Democratic",
    "Laissez-Faire",
    "Servant",
    "Situational",
    "Transactional",
    "Transformational"
  ];
  const width = 600;
  const height = 600;
  const center = 300;
  const maxRadius = 178;
  const scores = payload.scores || {};
  const pixels = Buffer.alloc(width * height * 4);
  for (let offset = 0; offset < pixels.length; offset += 4) {
    pixels[offset] = 251;
    pixels[offset + 1] = 252;
    pixels[offset + 2] = 250;
    pixels[offset + 3] = 255;
  }

  const blendPixel = (x, y, color, alpha = 1) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px < 0 || py < 0 || px >= width || py >= height) return;
    const offset = ((py * width) + px) * 4;
    pixels[offset] = Math.round((pixels[offset] * (1 - alpha)) + (color[0] * alpha));
    pixels[offset + 1] = Math.round((pixels[offset + 1] * (1 - alpha)) + (color[1] * alpha));
    pixels[offset + 2] = Math.round((pixels[offset + 2] * (1 - alpha)) + (color[2] * alpha));
  };
  const fillCircle = (cx, cy, radius, color, alpha = 1) => {
    const radiusSquared = radius * radius;
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
        if (((x - cx) ** 2) + ((y - cy) ** 2) <= radiusSquared) blendPixel(x, y, color, alpha);
      }
    }
  };
  const drawLine = (from, to, color, thickness = 2, alpha = 1) => {
    const distance = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y));
    for (let step = 0; step <= distance; step += 1) {
      const progress = distance ? step / distance : 0;
      fillCircle(from.x + ((to.x - from.x) * progress), from.y + ((to.y - from.y) * progress), thickness / 2, color, alpha);
    }
  };
  const drawRing = (radius, color, thickness = 2) => {
    const steps = Math.ceil(Math.PI * radius * 2);
    for (let step = 0; step < steps; step += 1) {
      const angle = (Math.PI * 2 * step) / steps;
      fillCircle(center + (Math.cos(angle) * radius), center + (Math.sin(angle) * radius), thickness / 2, color);
    }
  };
  const fillPolygon = (polygon, color, alpha) => {
    const minY = Math.max(0, Math.floor(Math.min(...polygon.map((item) => item.y))));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(...polygon.map((item) => item.y))));
    for (let y = minY; y <= maxY; y += 1) {
      const intersections = [];
      polygon.forEach((item, index) => {
        const next = polygon[(index + 1) % polygon.length];
        if ((item.y <= y && next.y > y) || (next.y <= y && item.y > y)) {
          intersections.push(item.x + (((y - item.y) / (next.y - item.y)) * (next.x - item.x)));
        }
      });
      intersections.sort((a, b) => a - b);
      for (let index = 0; index < intersections.length; index += 2) {
        for (let x = Math.ceil(intersections[index]); x <= Math.floor(intersections[index + 1]); x += 1) {
          blendPixel(x, y, color, alpha);
        }
      }
    }
  };
  const digitPatterns = {
    1: ["010", "110", "010", "010", "111"],
    2: ["110", "001", "010", "100", "111"],
    3: ["110", "001", "010", "001", "110"],
    4: ["101", "101", "111", "001", "001"],
    5: ["111", "100", "110", "001", "110"],
    6: ["011", "100", "111", "101", "111"],
    7: ["111", "001", "010", "010", "010"],
    8: ["111", "101", "111", "101", "111"]
  };
  const drawDigit = (value, cx, cy) => {
    const pattern = digitPatterns[value];
    const scale = 5;
    const startX = Math.round(cx - ((3 * scale) / 2));
    const startY = Math.round(cy - ((5 * scale) / 2));
    pattern.forEach((row, rowIndex) => {
      [...row].forEach((cell, columnIndex) => {
        if (cell === "1") {
          for (let y = 0; y < scale; y += 1) {
            for (let x = 0; x < scale; x += 1) {
              blendPixel(startX + (columnIndex * scale) + x, startY + (rowIndex * scale) + y, [255, 255, 255]);
            }
          }
        }
      });
    });
  };
  const ratio = (score) => Math.max(0.08, Math.min(1, (Number(score || 0) + 15) / 30));
  const point = (radius, index) => {
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / styles.length);
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      angle
    };
  };
  const points = styles.map((style, index) => ({
    style,
    value: point(maxRadius * ratio(scores[style]), index),
    outer: point(maxRadius, index),
    label: point(maxRadius + 52, index)
  }));
  const polygon = points.map(({ value }) => value);
  const overall = points.reduce((vector, item) => {
    vector.x += Math.cos(item.outer.angle) * ratio(scores[item.style]);
    vector.y += Math.sin(item.outer.angle) * ratio(scores[item.style]);
    return vector;
  }, { x: 0, y: 0 });
  const magnitude = Math.hypot(overall.x, overall.y) / styles.length;
  const angle = Math.atan2(overall.y, overall.x);
  const landing = {
    x: center + Math.cos(angle) * maxRadius * Math.min(1, magnitude * 1.8),
    y: center + Math.sin(angle) * maxRadius * Math.min(1, magnitude * 1.8)
  };

  [maxRadius * 0.25, maxRadius * 0.5, maxRadius * 0.75].forEach((radius) => drawRing(radius, [223, 232, 228], 2));
  drawRing(maxRadius, [142, 189, 184], 4);
  points.forEach(({ outer }) => drawLine({ x: center, y: center }, outer, [225, 233, 230], 2));
  fillPolygon(polygon, [15, 124, 120], 0.16);
  polygon.forEach((item, index) => drawLine(item, polygon[(index + 1) % polygon.length], [15, 124, 120], 6));
  points.forEach(({ value, label }, index) => {
    fillCircle(value.x, value.y, 9, [255, 255, 255]);
    fillCircle(value.x, value.y, 6, [11, 101, 98]);
    fillCircle(label.x, label.y, 22, [11, 101, 98]);
    drawDigit(index + 1, label.x, label.y);
  });
  fillCircle(center, center, 7, [219, 161, 36]);
  fillCircle(landing.x, landing.y, 20, [255, 255, 255]);
  fillCircle(landing.x, landing.y, 14, [219, 161, 36]);

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * ((width * 4) + 1);
    raw[rowOffset] = 0;
    pixels.copy(raw, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function htmlResultEmail(payload) {
  const primaryStyles = payload.primaryStyles || [];
  const resultTitle = primaryStyles.length
    ? `${primaryStyles.map(escapeHtml).join(" + ")} Leadership`
    : "Leadership Profile Review";
  const ranked = Object.entries(payload.scores || {}).sort((a, b) => b[1] - a[1]);
  const cards = ranked.map(([style, score], index) => {
    const label = payload.scoreLabels?.[style] || strengthLabel(score);
    const highlighted = primaryStyles.includes(style);
    return `<tr><td style="padding:0 0 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${highlighted ? "#8dcac4" : "#dbe5e1"};background:${highlighted ? "#eef8f5" : "#ffffff"};border-radius:8px;"><tr><td style="padding:16px 18px;font-family:Arial,sans-serif;font-size:16px;font-weight:700;color:#142522;">${index + 1}. ${escapeHtml(style)}</td><td align="right" style="padding:16px 18px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#0b6562;white-space:nowrap;">${escapeHtml(label)}</td></tr></table></td></tr>`;
  }).join("");
  const axisLegend = [
    "1 Autocratic",
    "2 Charismatic",
    "3 Democratic",
    "4 Laissez-Faire",
    "5 Servant",
    "6 Situational",
    "7 Transactional",
    "8 Transformational"
  ].join(" &nbsp;&middot;&nbsp; ");

  return `<!doctype html><html><body style="margin:0;background:#f2f6f3;color:#142522;font-family:Arial,sans-serif;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f6f3;"><tr><td align="center" style="padding:24px 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;background:#ffffff;border:1px solid #dbe5e1;border-radius:12px;overflow:hidden;"><tr><td style="padding:36px 28px 18px;"><div style="font-size:13px;letter-spacing:2px;font-weight:700;color:#63cec6;text-transform:uppercase;">Your Leadership Profile</div><h1 style="margin:16px 0 14px;font-size:34px;line-height:1.1;color:#101b19;">${resultTitle}</h1><p style="margin:0;color:#61736e;font-size:17px;line-height:1.55;">${escapeHtml(payload.resultSummary || "Your leadership profile is ready.")}</p></td></tr><tr><td style="padding:18px 28px 28px;"><h2 style="margin:0 0 8px;font-size:20px;color:#142522;">Leadership Style Map</h2><p style="margin:0 0 16px;color:#61736e;font-size:14px;line-height:1.5;">The marker shows how your overall responses are distributed across styles.</p><div style="text-align:center;"><img src="cid:leadership-style-map" width="520" alt="Leadership style map" style="display:block;width:100%;max-width:520px;height:auto;margin:0 auto;border:0;"></div><p style="margin:14px 0 0;color:#61736e;font-size:12px;line-height:1.7;text-align:center;">${axisLegend}</p></td></tr><tr><td style="padding:8px 28px 30px;"><h2 style="margin:0 0 14px;font-size:20px;color:#142522;">Your tendencies</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table></td></tr><tr><td style="padding:22px 28px;background:#f6faf8;border-top:1px solid #dbe5e1;color:#61736e;font-size:12px;line-height:1.55;">This assessment is intended for leadership reflection and development. No leadership style is inherently better than another; effective leadership depends on context, adaptability, and the needs of the people being led.</td></tr></table></td></tr></table></body></html>`;
}

async function emailResult(payload) {
  if (!isEmailConfigured()) {
    throw new Error("Result email environment variables are not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: RESULT_EMAIL_FROM,
      to: payload.respondent.email,
      subject: "Your leadership assessment results",
      text: textResultEmail(payload),
      html: htmlResultEmail(payload),
      attachments: [{
        content: emailRadarPng(payload).toString("base64"),
        filename: "leadership-style-map.png",
        content_id: "leadership-style-map",
        content_type: "image/png"
      }]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Result email failed.");
  }

  return data;
}

async function listAttempts(request) {
  if (!ADMIN_REVIEW_TOKEN) {
    return { status: 501, payload: { error: "Admin review token is not configured." } };
  }

  const suppliedToken = request.headers["x-admin-token"];
  if (suppliedToken !== ADMIN_REVIEW_TOKEN) {
    return { status: 401, payload: { error: "Unauthorized." } };
  }

  const attempts = await supabaseRequest(
    "assessment_attempts?select=id,created_at,respondent_label,email,primary_styles,is_interpretable,questions_asked,scores,response_quality,result_summary&order=created_at.desc&limit=100",
    {
      method: "GET",
      headers: { Prefer: undefined }
    }
  );

  return { status: 200, payload: { attempts } };
}

module.exports = async function handler(request, response) {
  try {
    if (request.method === "POST") {
      const payload = await readBody(request);
      const validationError = validateAttempt(payload);
      if (validationError) {
        json(response, 400, { error: validationError });
        return;
      }

      const result = { saved: false, emailed: false, errors: [] };

      if (isSupabaseConfigured()) {
        try {
          Object.assign(result, await saveAttempt(payload), { saved: true });
        } catch (error) {
          result.errors.push({ service: "database", message: error.message || "Database save failed." });
        }
      }

      if (isEmailConfigured()) {
        try {
          await emailResult(payload);
          result.emailed = true;
        } catch (error) {
          result.errors.push({ service: "email", message: error.message || "Result email failed." });
        }
      }

      if (!result.saved && !result.emailed) {
        const configuredServices = {
          database: isSupabaseConfigured(),
          email: isEmailConfigured()
        };
        console.error("Assessment delivery failed.", {
          attemptId: payload.id,
          configuredServices,
          errors: result.errors
        });
        json(response, 500, {
          error: "Assessment result could not be saved or emailed.",
          configuredServices,
          errors: result.errors
        });
        return;
      }

      json(response, 201, { ok: true, ...result });
      return;
    }

    if (request.method === "GET") {
      const result = await listAttempts(request);
      json(response, result.status, result.payload);
      return;
    }

    response.setHeader("Allow", "GET, POST");
    json(response, 405, { error: "Method not allowed." });
  } catch (error) {
    json(response, 500, { error: error.message || "Unexpected server error." });
  }
};
