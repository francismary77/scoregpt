import type { ConfidenceLabel, PublishingTier } from "./domain";
export const PUBLISHING_TIER_LABELS: Readonly<Record<PublishingTier, string>> = Object.freeze({ TOP_PICK: "Top AI Pick", STANDARD_ANALYSIS: "Match Analysis", LIMITED_EVIDENCE: "Limited Data" });
export const CONFIDENCE_LABELS: Readonly<Record<ConfidenceLabel, string>> = Object.freeze({ LOW: "Low Confidence", MODERATE: "Moderate Confidence", STRONG: "Strong Confidence" });
export const AI_CONFIDENCE_SHORT_DISCLAIMER = "AI Confidence is a relative reliability indicator based on available historical evidence. It is not a guarantee of the match outcome.";
export const AI_CONFIDENCE_LONG_EXPLANATION = "Prediction Confidence ranks how strongly the available historical evidence supports a model prediction. It should not be interpreted as a guaranteed success rate or as independently calibrated betting odds.";
