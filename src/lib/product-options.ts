export const productFormats = [
  { id: "guide", label: "Step-by-step guide" },
  { id: "action-plan", label: "Action plan" },
  { id: "checklist", label: "Checklist" },
  { id: "workbook", label: "Workbook" },
  { id: "study-guide", label: "Study guide" },
] as const;

export type ProductFormat = (typeof productFormats)[number]["id"];

export const starterPrompts = [
  {
    label: "Fitness",
    prompt: "Create a beginner-friendly 7-day fitness plan with short daily workouts.",
  },
  {
    label: "Meal planning",
    prompt: "Create a practical 5-day meal plan with simple recipes and a grocery list.",
  },
  {
    label: "Study routine",
    prompt: "Build a two-week study schedule with focused sessions and review checkpoints.",
  },
  {
    label: "Personal finance",
    prompt: "Create a simple monthly budgeting plan with weekly actions and a tracking checklist.",
  },
] as const;

export function isProductFormat(value: unknown): value is ProductFormat {
  return (
    typeof value === "string" &&
    productFormats.some((format) => format.id === value)
  );
}

export function getProductFormatLabel(format: ProductFormat) {
  return productFormats.find((option) => option.id === format)?.label;
}
