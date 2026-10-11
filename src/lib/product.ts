import "server-only";

import OpenAI from "openai";
import type { ProductFormat } from "@/lib/product-options";

export type ProductDraft = {
  title: string;
  content: string;
};

export async function generateProduct(
  request: string,
  format: ProductFormat = "guide",
): Promise<ProductDraft> {
  const formatInstructions: Record<ProductFormat, string> = {
    guide: "Format the product as a practical, clearly organized step-by-step guide.",
    "action-plan":
      "Format the product as a time-based action plan with milestones, concrete tasks, and progress checks.",
    checklist:
      "Format the product as a concise, actionable checklist grouped into clear stages.",
    workbook:
      "Format the product as an interactive workbook with short explanations, reflection prompts, and fill-in exercises.",
    "study-guide":
      "Format the product as a study guide with learning objectives, focused sections, recall questions, and review steps.",
  };
  const generationRequest = `${formatInstructions[format]}\n\nCustomer request: ${request}`;

  if (!process.env.OPENAI_API_KEY) {
    const formatExamples: Record<ProductFormat, string[]> = {
      guide: [
        "1. Define your goal.",
        "2. Break it into manageable steps.",
        "3. Create a realistic weekly routine.",
        "4. Track progress and review results.",
        "5. Adjust the plan to your needs.",
      ],
      "action-plan": [
        "START HERE — Write down your goal and the time you can commit.",
        "WEEK 1 — Choose one small action and schedule it.",
        "WEEK 2 — Repeat what worked and add one next step.",
        "CHECK-IN — Review progress and adjust the next week's actions.",
      ],
      checklist: [
        "GET READY",
        "[ ] Define the outcome you want.",
        "[ ] Gather the time and resources you need.",
        "",
        "TAKE ACTION",
        "[ ] Complete one manageable step at a time.",
        "[ ] Check off progress and note anything blocking you.",
        "",
        "REVIEW",
        "[ ] Review what worked and choose your next step.",
      ],
      workbook: [
        "1. YOUR GOAL",
        "What would success look like for you?",
        "Write your answer: __________________________________",
        "",
        "2. YOUR FIRST STEP",
        "What is one small action you can take this week?",
        "Write your answer: __________________________________",
        "",
        "3. WEEKLY REFLECTION",
        "What went well? What will you adjust next week?",
      ],
      "study-guide": [
        "LEARNING GOAL",
        "Write down the main thing you want to understand.",
        "",
        "FOCUSED STUDY",
        "1. Break the topic into short sections.",
        "2. Study one section, then recall the main points without notes.",
        "3. Mark questions to revisit.",
        "",
        "REVIEW CHECK",
        "Explain the key ideas in your own words and plan your next review.",
      ],
    };

    return {
      title:
        format === "guide"
          ? "Your Personalized Digital Guide"
          : `Your Personalized ${format.replaceAll("-", " ")}`,
      content: [
        `YOUR PERSONALIZED ${format.replaceAll("-", " ").toUpperCase()}`,
        "",
        `Your request: ${request}`,
        "",
        ...formatExamples[format],
        "",
        "This is demo content. Review it before use.",
      ].join("\n"),
    };
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Create a useful personalized digital guide. Return JSON with string fields title and content. Use clear headings and actionable steps. Avoid guarantees and unsupported professional claims.",
      },
      {
        role: "user",
        content: generationRequest,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;

  if (!raw) {
    throw new Error("AI did not return product content.");
  }

  const result: unknown = JSON.parse(raw);

  if (
    typeof result !== "object" ||
    result === null ||
    !("title" in result) ||
    typeof result.title !== "string" ||
    !("content" in result) ||
    typeof result.content !== "string"
  ) {
    throw new Error("Invalid AI product format.");
  }

  return {
    title: result.title.slice(0, 255),
    content: result.content.slice(0, 40000),
  };
}
