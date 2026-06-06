// DeepSeek V3.2 pricing via DeepInfra
const INPUT_COST_PER_MILLION = 0.26;
const OUTPUT_COST_PER_MILLION = 0.38;

export function estimateCost(promptTokens: number, completionTokens: number): number {
  const inputCost = (promptTokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (completionTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;
  return Number((inputCost + outputCost).toFixed(6));
}
