export type AnalysisResult = {
  customer: {
    name: string;
  };
  project: {
    trade: string;
    service: string;
    estimatedArea: number | null;
  };
  workflow: {
    priority: "low" | "normal" | "high";
    confidence: number;
    nextAction: string;
  };
  nextSteps: string[];
  missingInformation: string[];
  recommendedTask: {
    type: "offer" | "visit" | "supplier";
    title: string;
  };
};

export type OfferPosition = {
  id: number;
  description: string;
  quantity: number;
  unit: string;
  notes: string;
};

export type OfferDraft = {
  customerName: string;
  title: string;
  projectSummary: string;
  positions: OfferPosition[];
  assumptions: string[];
  missingInformation: string[];
  recommendedNextStep: string;
  status: "draft";
};

export type OfferStatus = "idle" | "generating" | "completed" | "error";
