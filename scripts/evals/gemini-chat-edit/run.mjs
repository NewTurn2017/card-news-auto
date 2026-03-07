import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { performance } from "node:perf_hooks";
import { GoogleGenAI } from "@google/genai";
import { chatEditEvalCases } from "./cases.mjs";
import {
  CHAT_EDIT_ALLOWED_FONT_FAMILIES,
  CHAT_EDIT_ALLOWED_LAYOUT_IDS,
  CHAT_EDIT_ALLOWED_OPERATION_TYPES,
  CHAT_EDIT_ALLOWED_SCOPE,
  CHAT_EDIT_PLAN_SCHEMA,
} from "./schema.mjs";
import {
  DEFAULT_MODEL_IDS,
  MODEL_DOCS,
  PROMPT_VERSION,
  REPAIR_SYSTEM_INSTRUCTION,
  SYSTEM_INSTRUCTION,
  buildPromptPayload,
} from "./prompt.mjs";

function parseArgs(argv) {
  const options = {
    models: DEFAULT_MODEL_IDS,
    maxCases: null,
    outputDir: ".evals/gemini-chat-edit",
    timeoutMs: 60000,
  };

  for (const arg of argv) {
    if (arg.startsWith("--models=")) {
      options.models = arg
        .slice("--models=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      continue;
    }

    if (arg.startsWith("--max-cases=")) {
      const parsed = Number(arg.slice("--max-cases=".length));
      if (Number.isFinite(parsed) && parsed > 0) {
        options.maxCases = parsed;
      }
      continue;
    }

    if (arg.startsWith("--output-dir=")) {
      options.outputDir = arg.slice("--output-dir=".length);
      continue;
    }

    if (arg.startsWith("--timeout-ms=")) {
      const parsed = Number(arg.slice("--timeout-ms=".length));
      if (Number.isFinite(parsed) && parsed > 0) {
        options.timeoutMs = parsed;
      }
    }
  }

  return options;
}

function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 또는 GOOGLE_API_KEY 가 필요합니다.");
  }
  return apiKey;
}

function timestampLabel(date) {
  return date.toISOString().replaceAll(":", "-");
}

function normalizeOperations(plan) {
  if (!Array.isArray(plan.operations)) {
    return [];
  }

  return plan.operations.filter((operation) => operation && typeof operation === "object");
}

function evaluatePlan(plan, testCase) {
  const issues = [];
  const warnings = [];
  const operations = normalizeOperations(plan);
  const requiredOperationTypes = testCase.expectations.requiredOperationTypes ?? [];
  const forbiddenOperationTypes = testCase.expectations.forbiddenOperationTypes ?? [];
  const allowedSlideRefs = testCase.expectations.allowedSlideRefs ?? [];
  const mustTouchFields = testCase.expectations.mustTouchFields ?? [];

  if (!CHAT_EDIT_ALLOWED_SCOPE.includes(plan.scope)) {
    issues.push(`invalid scope: ${String(plan.scope)}`);
  }

  if (plan.scope !== testCase.expectations.expectedScope) {
    issues.push(
      `scope mismatch: expected ${testCase.expectations.expectedScope}, got ${String(plan.scope)}`
    );
  }

  if (typeof plan.summary !== "string" || plan.summary.trim().length < 8) {
    issues.push("summary too short");
  }

  if (operations.length === 0) {
    issues.push("no operations returned");
  }

  const opTypes = operations.map((operation) => operation.type);

  for (const opType of opTypes) {
    if (!CHAT_EDIT_ALLOWED_OPERATION_TYPES.includes(opType)) {
      issues.push(`unknown operation type: ${String(opType)}`);
    }
  }

  for (const requiredType of requiredOperationTypes) {
    if (!opTypes.includes(requiredType)) {
      issues.push(`missing required operation type: ${requiredType}`);
    }
  }

  for (const forbiddenType of forbiddenOperationTypes) {
    if (opTypes.includes(forbiddenType)) {
      issues.push(`forbidden operation type present: ${forbiddenType}`);
    }
  }

  for (const operation of operations) {
    if (
      typeof operation.layoutId === "string" &&
      !CHAT_EDIT_ALLOWED_LAYOUT_IDS.includes(operation.layoutId)
    ) {
      issues.push(`invalid layoutId: ${operation.layoutId}`);
    }

    if (
      typeof operation.slideRef === "string" &&
      allowedSlideRefs.length > 0 &&
      !allowedSlideRefs.includes(operation.slideRef)
    ) {
      issues.push(`unexpected slideRef: ${operation.slideRef}`);
    }

    if (
      operation.changes &&
      typeof operation.changes.fontFamily === "string" &&
      !CHAT_EDIT_ALLOWED_FONT_FAMILIES.includes(operation.changes.fontFamily)
    ) {
      issues.push(`invalid fontFamily: ${operation.changes.fontFamily}`);
    }

    if (
      typeof operation.targetField === "string" &&
      !["category", "title", "subtitle", "body"].includes(operation.targetField)
    ) {
      issues.push(`invalid targetField: ${operation.targetField}`);
    }

    if (testCase.scope === "selected_text" && testCase.selectedField) {
      const touchesOtherField =
        typeof operation.targetField === "string" &&
        operation.targetField !== testCase.selectedField;
      if (touchesOtherField) {
        warnings.push(
          `selected_text case touched another field: ${operation.targetField}`
        );
      }
    }
  }

  if (mustTouchFields.length > 0) {
    const touchedFields = new Set();
    for (const operation of operations) {
      if (typeof operation.targetField === "string") {
        touchedFields.add(operation.targetField);
      }
      if (operation.changes && typeof operation.changes === "object") {
        for (const key of Object.keys(operation.changes)) {
          if (["category", "title", "subtitle", "body"].includes(key)) {
            touchedFields.add(key);
          }
        }
      }
    }

    for (const field of mustTouchFields) {
      if (!touchedFields.has(field)) {
        issues.push(`expected field not touched: ${field}`);
      }
    }
  }

  const score = Math.max(0, 100 - issues.length * 18 - warnings.length * 4);

  return {
    pass: issues.length === 0,
    score,
    issues,
    warnings,
    operationCount: operations.length,
  };
}

function sanitizeForJson(planText) {
  return typeof planText === "string" ? planText.trim() : "";
}

function tryParseJson(text) {
  const attempts = [];

  function tryOne(label, candidate) {
    if (!candidate || typeof candidate !== "string") {
      return null;
    }

    try {
      return {
        parsed: JSON.parse(candidate),
        parseStrategy: label,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      attempts.push(`${label}: ${message}`);
      return null;
    }
  }

  const trimmed = sanitizeForJson(text);
  const direct = tryOne("direct", trimmed);
  if (direct) return { ...direct, attempts };

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    const fenced = tryOne("fence", fenceMatch[1].trim());
    if (fenced) return { ...fenced, attempts };
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const objectSlice = trimmed.slice(firstBrace, lastBrace + 1);
    const sliced = tryOne("outer-object", objectSlice);
    if (sliced) return { ...sliced, attempts };

    const noTrailingCommas = objectSlice.replace(/,\s*([}\]])/g, "$1");
    const trailingCommaFixed = tryOne("strip-trailing-commas", noTrailingCommas);
    if (trailingCommaFixed) return { ...trailingCommaFixed, attempts };
  }

  return { parsed: null, parseStrategy: "failed", attempts };
}

async function callModel(ai, model, inputText, systemInstruction, timeoutMs) {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => {
    abortController.abort(new Error(`timeout after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    return await ai.models.generateContent({
      model,
      contents: inputText,
      config: {
        abortSignal: abortController.signal,
        systemInstruction,
        temperature: 0,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: CHAT_EDIT_PLAN_SCHEMA,
      },
    });
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function repairJsonPlan(ai, model, responseText, timeoutMs) {
  const repairPayload = {
    task: "Repair malformed JSON for card-news edit plan schema.",
    brokenJson: responseText,
    rules: [
      "Return valid JSON only",
      "Preserve semantics",
      "Do not add markdown fences",
      "Match the schema exactly",
    ],
  };

  const response = await callModel(
    ai,
    model,
    JSON.stringify(repairPayload, null, 2),
    REPAIR_SYSTEM_INSTRUCTION,
    timeoutMs
  );
  const repairedText = sanitizeForJson(response.text);
  const recovered = tryParseJson(repairedText);
  if (!recovered.parsed) {
    const detail = recovered.attempts.join(" | ");
    throw new Error(`repair parse failed: ${detail}`);
  }

  return {
    repairedText,
    repairedParsed: recovered.parsed,
    repairParseStrategy: recovered.parseStrategy,
  };
}

async function generatePlan(ai, model, testCase, timeoutMs) {
  const startedAt = performance.now();
  const promptPayload = buildPromptPayload(testCase);
  const response = await callModel(
    ai,
    model,
    JSON.stringify(promptPayload, null, 2),
    SYSTEM_INSTRUCTION,
    timeoutMs
  );
  const endedAt = performance.now();

  const responseText = sanitizeForJson(response.text);
  const parseResult = tryParseJson(responseText);
  let parsed = parseResult.parsed;
  let repaired = false;
  let repairError = null;
  let repairParseStrategy = null;
  let repairedText = null;

  if (!parsed) {
    try {
      const repairedResult = await repairJsonPlan(
        ai,
        model,
        responseText,
        Math.min(timeoutMs, 8000)
      );
      parsed = repairedResult.repairedParsed;
      repaired = true;
      repairParseStrategy = repairedResult.repairParseStrategy;
      repairedText = repairedResult.repairedText;
    } catch (error) {
      repairError = error instanceof Error ? error.message : String(error);
    }
  }

  if (!parsed) {
    const detail = parseResult.attempts.join(" | ");
    throw new Error(repairError ?? detail ?? "JSON parse failed");
  }

  const evaluation = evaluatePlan(parsed, testCase);
  const usage = response.usageMetadata ?? null;

  return {
    model,
    caseId: testCase.id,
    caseDescription: testCase.description,
    latencyMs: Math.round(endedAt - startedAt),
    evaluation,
    responseText,
    parsed,
    usage,
    parseStrategy: parseResult.parseStrategy,
    repaired,
    repairedText,
    repairParseStrategy,
    repairError,
  };
}

function summarizeResults(results, models, cases) {
  const perModel = models.map((model) => {
    const modelResults = results.filter((result) => result.model === model);
    const passCount = modelResults.filter((result) => result.evaluation.pass).length;
    const repairedCount = modelResults.filter((result) => result.repaired).length;
    const averageLatencyMs =
      modelResults.reduce((sum, result) => sum + result.latencyMs, 0) /
      Math.max(modelResults.length, 1);
    const averageScore =
      modelResults.reduce((sum, result) => sum + result.evaluation.score, 0) /
      Math.max(modelResults.length, 1);

    return {
      model,
      docUrl: MODEL_DOCS[model] ?? null,
      caseCount: modelResults.length,
      passCount,
      repairedCount,
      passRate: Number((passCount / Math.max(modelResults.length, 1)).toFixed(2)),
      averageLatencyMs: Math.round(averageLatencyMs),
      averageScore: Number(averageScore.toFixed(2)),
    };
  });

  return {
    totalCases: cases.length,
    totalRuns: results.length,
    perModel,
  };
}

function buildMarkdownReport({
  startedAt,
  completedAt,
  summary,
  results,
}) {
  const lines = [];
  lines.push("# Gemini Chat Edit Model Comparison");
  lines.push("");
  lines.push(`- Prompt Version: ${PROMPT_VERSION}`);
  lines.push(`- Started: ${startedAt.toISOString()}`);
  lines.push(`- Completed: ${completedAt.toISOString()}`);
  lines.push(`- Cases: ${summary.totalCases}`);
  lines.push(`- Runs: ${summary.totalRuns}`);
  lines.push("");
  lines.push("## Model Summary");
  lines.push("");
  lines.push("| Model | Pass | Repaired | Avg Score | Avg Latency (ms) | Official Doc |");
  lines.push("|------|------:|---------:|----------:|-----------------:|--------------|");

  for (const item of summary.perModel) {
    lines.push(
      `| ${item.model} | ${item.passCount}/${item.caseCount} | ${item.repairedCount} | ${item.averageScore} | ${item.averageLatencyMs} | ${item.docUrl ?? "-"} |`
    );
  }

  lines.push("");
  lines.push("## Case-by-case");
  lines.push("");

  for (const result of results) {
    lines.push(`### ${result.model} / ${result.caseId}`);
    lines.push("");
    lines.push(`- Description: ${result.caseDescription}`);
    lines.push(`- Latency: ${result.latencyMs}ms`);
    lines.push(`- Pass: ${result.evaluation.pass}`);
    lines.push(`- Score: ${result.evaluation.score}`);
    lines.push(`- Parse strategy: ${result.parseStrategy}`);
    lines.push(`- Repaired: ${result.repaired}`);
    if (result.repairParseStrategy) {
      lines.push(`- Repair parse strategy: ${result.repairParseStrategy}`);
    }
    if (result.evaluation.issues.length > 0) {
      lines.push(`- Issues: ${result.evaluation.issues.join(" | ")}`);
    }
    if (result.evaluation.warnings.length > 0) {
      lines.push(`- Warnings: ${result.evaluation.warnings.join(" | ")}`);
    }
    lines.push(`- Summary: ${result.parsed.summary}`);
    lines.push(`- Operation count: ${result.evaluation.operationCount}`);
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });
  const startedAt = new Date();
  const outputDir = path.resolve(options.outputDir);
  const cases =
    options.maxCases === null
      ? chatEditEvalCases
      : chatEditEvalCases.slice(0, options.maxCases);

  await mkdir(outputDir, { recursive: true });

  const results = [];

  for (const model of options.models) {
    console.log(`\n=== MODEL: ${model} ===`);
    for (const testCase of cases) {
      process.stdout.write(`- ${testCase.id} ... `);
      try {
        const result = await generatePlan(ai, model, testCase, options.timeoutMs);
        results.push(result);
        const repairedLabel = result.repaired ? " repaired" : "";
        console.log(
          `pass=${result.evaluation.pass} score=${result.evaluation.score} latency=${result.latencyMs}ms${repairedLabel}`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log(`ERROR: ${message}`);
        results.push({
          model,
          caseId: testCase.id,
          caseDescription: testCase.description,
          latencyMs: -1,
          evaluation: {
            pass: false,
            score: 0,
            issues: [`runtime error: ${message}`],
            warnings: [],
            operationCount: 0,
          },
          responseText: "",
          parsed: {
            summary: "",
            scope: "",
            operations: [],
            warnings: [],
          },
          usage: null,
          parseStrategy: "failed",
          repaired: false,
          repairedText: null,
          repairParseStrategy: null,
          repairError: message,
        });
      }
    }
  }

  const completedAt = new Date();
  const summary = summarizeResults(results, options.models, cases);
  const timestamp = timestampLabel(completedAt);
  const jsonPath = path.join(outputDir, `gemini-chat-edit-comparison-${timestamp}.json`);
  const markdownPath = path.join(outputDir, `gemini-chat-edit-comparison-${timestamp}.md`);
  const markdown = buildMarkdownReport({
    startedAt,
    completedAt,
    summary,
    results,
  });

  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        promptVersion: PROMPT_VERSION,
        models: options.models,
        caseCount: cases.length,
        summary,
        results,
      },
      null,
      2
    )
  );
  await writeFile(markdownPath, markdown);

  console.log("\n=== SUMMARY ===");
  for (const item of summary.perModel) {
    console.log(
      `${item.model}: pass ${item.passCount}/${item.caseCount}, repaired ${item.repairedCount}, avg score ${item.averageScore}, avg latency ${item.averageLatencyMs}ms`
    );
  }
  console.log(`\nJSON report: ${jsonPath}`);
  console.log(`Markdown report: ${markdownPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
