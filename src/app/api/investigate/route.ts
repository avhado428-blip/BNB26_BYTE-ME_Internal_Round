import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(request: Request) {
  try {
    const incomingFormData = await request.formData();

    const backendFormData = new FormData();

    const artifacts = incomingFormData.getAll("artifacts");

    for (const artifact of artifacts) {
      if (artifact instanceof File) {
        backendFormData.append("artifacts", artifact);
      }
    }

    const context = incomingFormData.get("context");

    if (typeof context === "string" && context.trim()) {
      backendFormData.append("context", context);
    }

    if (artifacts.length === 0) {
      return NextResponse.json(
        {
          error: "At least one artifact file is required.",
        },
        {
          status: 400,
        }
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/api/investigate`,
      {
        method: "POST",
        body: backendFormData,
      }
    );

    const text = await response.text();

    let result: unknown;

    try {
      result = JSON.parse(text);
    } catch {
      result = {
        error: text || "Backend returned an invalid response.",
      };
    }

    return NextResponse.json(result, {
      status: response.status,
    });
  } catch (error) {
    console.error("FastAPI investigation proxy failed:", error);

    return NextResponse.json(
      {
        error:
          "Unable to connect to the TrustLayer investigation backend.",
      },
      {
        status: 502,
      }
    );
  }
}