import { setApiKeyActivated } from "@/app/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body: {
    orgId: string;
    apiKey: string;
  } = await request.json().catch((err) => {
    console.error(err);
    return NextResponse.json(
      { json: { error: "bad request" } },
      { status: 400 },
    );
  });

  try {
    setApiKeyActivated(body.orgId, body.apiKey);
    return NextResponse.json({ activated: true }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ json: { error: "error" } }, { status: 500 });
  }
}