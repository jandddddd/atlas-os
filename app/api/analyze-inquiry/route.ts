import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type InquiryRequest = {
  inquiry?: string;
};

export async function POST(request: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Der Anthropic-API-Schlüssel fehlt." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as InquiryRequest;
    const inquiry = body.inquiry?.trim();

    if (!inquiry) {
      return NextResponse.json(
        { error: "Es wurde keine Kundenanfrage übermittelt." },
        { status: 400 },
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: `
Du analysierst Kundenanfragen für einen deutschen Handwerksbetrieb.

Antworte ausschließlich mit gültigem JSON und ohne Markdown.
Verwende genau dieses Format:

{
  "customer": {
    "name": "string"
  },
  "project": {
    "trade": "string",
    "service": "string",
    "estimatedArea": 0
  },
  "workflow": {
    "priority": "low | normal | high",
    "confidence": 0.0,
    "nextAction": "string"
  },
  "nextSteps": ["string"],
  "missingInformation": ["string"],
  "recommendedTask": {
    "type": "offer | visit | supplier",
    "title": "string"
  }
}

Regeln:
- Antworte ausschließlich mit gültigem JSON und ohne Markdown.
- confidence muss zwischen 0 und 1 liegen.
- estimatedArea muss eine Zahl sein, wenn eine Fläche genannt wurde.
- Wenn keine Fläche erkennbar ist, verwende null.
- Formuliere knapp und auf Deutsch.
- Erfinde keine Preise, Termine, Namen oder Maße.
- Fehlende Angaben gehören in missingInformation.
- customer.name darf nur aus der Anfrage übernommen werden.
- Wenn kein Kundenname genannt wird, verwende "Unbekannt".
      `.trim(),
      messages: [
        {
          role: "user",
          content: inquiry,
        },
      ],
    });

    const textBlock = message.content.find(
      (block) => block.type === "text",
    );

    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Claude hat keine Textantwort geliefert.");
    }

    const cleanedText = textBlock.text
  .trim()
  .replace(/^```json\s*/i, "")
  .replace(/^```\s*/, "")
  .replace(/\s*```$/, "");

const analysis = JSON.parse(cleanedText);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Analyse fehlgeschlagen:", error);

    return NextResponse.json(
      {
        error:
          "Die Anfrage konnte nicht analysiert werden. Bitte versuche es erneut.",
      },
      { status: 500 },
    );
  }
}