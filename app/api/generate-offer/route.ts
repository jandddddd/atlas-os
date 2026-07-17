import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type GenerateOfferRequest = {
  inquiry?: string;
  analysis?: {
    customer?: {
      name?: string;
    };
    project?: {
      trade?: string;
      service?: string;
      estimatedArea?: number | null;
    };
    workflow?: {
      priority?: "low" | "normal" | "high";
      confidence?: number;
      nextAction?: string;
    };
    missingInformation?: string[];
  };
};

const offerSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    customerName: {
      type: "string",
    },
    title: {
      type: "string",
    },
    projectSummary: {
      type: "string",
    },
    positions: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: {
            type: "integer",
          },
          description: {
            type: "string",
          },
          quantity: {
            type: "number",
          },
          unit: {
            type: "string",
          },
          notes: {
            type: "string",
          },
        },
        required: [
          "id",
          "description",
          "quantity",
          "unit",
          "notes",
        ],
      },
    },
    assumptions: {
      type: "array",
      items: {
        type: "string",
      },
    },
    missingInformation: {
      type: "array",
      items: {
        type: "string",
      },
    },
    recommendedNextStep: {
      type: "string",
    },
    status: {
      type: "string",
      enum: ["draft"],
    },
  },
  required: [
    "customerName",
    "title",
    "projectSummary",
    "positions",
    "assumptions",
    "missingInformation",
    "recommendedNextStep",
    "status",
  ],
} as const;

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: "Der Anthropic-API-Schlüssel fehlt.",
        },
        {
          status: 500,
        },
      );
    }

    const body = (await request.json()) as GenerateOfferRequest;

    const inquiry = body.inquiry?.trim();
    const analysis = body.analysis;

    if (!inquiry) {
      return NextResponse.json(
        {
          error: "Die ursprüngliche Kundenanfrage fehlt.",
        },
        {
          status: 400,
        },
      );
    }

    if (!analysis?.project?.service) {
      return NextResponse.json(
        {
          error: "Die vorherige Anfrageanalyse fehlt.",
        },
        {
          status: 400,
        },
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1600,

      output_config: {
        format: {
          type: "json_schema",
          schema: offerSchema,
        },
      },

      system: `
Du erstellst fachliche Angebotsentwürfe für deutsche
Handwerksbetriebe.

Deine Aufgabe ist es, eine Kundenanfrage und ihre vorherige Analyse
in sinnvolle Angebotspositionen zu überführen.

Wichtige Regeln:

- Formuliere knapp, professionell und auf Deutsch.
- Erstelle nur Positionen, die sich aus der Anfrage ableiten lassen.
- Erfinde keine Preise.
- Erfinde keine Kundendaten.
- Erfinde keine nicht genannten Maße.
- Verwende geschätzte Mengen nur dann, wenn sie aus einer genannten
  Fläche nachvollziehbar abgeleitet werden können.
- Unsichere Annahmen gehören in assumptions.
- Fehlende Angaben gehören in missingInformation.
- Bei fehlendem Kundennamen verwende "Unbekannt".
- Die Ausgabe ist ein Entwurf und benötigt die Freigabe des Betriebs.
- Übertrage eine genannte Raumfläche nicht automatisch auf Wand- oder Deckenflächen.
- Wenn eine Menge nicht eindeutig aus der Anfrage ableitbar ist, verwende quantity: 0.
- Verwende bei unbekannter Menge unit: "noch zu ermitteln".
- Beschreibe die Unsicherheit zusätzlich in notes und assumptions.
- Vor einer genauen Mengenermittlung sind eine Besichtigung oder belastbares Bild- und Maßmaterial erforderlich.      
`.trim(),

      messages: [
        {
          role: "user",
          content: `
Ursprüngliche Kundenanfrage:

${inquiry}

Vorherige Atlas-Analyse:

${JSON.stringify(analysis, null, 2)}

Erstelle daraus jetzt einen fachlichen Angebotsentwurf.
          `.trim(),
        },
      ],
    });

    const textBlock = message.content.find(
      (block) => block.type === "text",
    );

    if (!textBlock || textBlock.type !== "text") {
      throw new Error(
        "Claude hat keinen Angebotsentwurf geliefert.",
      );
    }

    const offer = JSON.parse(textBlock.text);

    return NextResponse.json({
      offer,
    });
  } catch (error) {
    console.error("Angebotserstellung fehlgeschlagen:", error);

    return NextResponse.json(
      {
        error:
          "Der Angebotsentwurf konnte nicht erstellt werden. " +
          "Bitte versuche es erneut.",
      },
      {
        status: 500,
      },
    );
  }
}