import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/authz";
import { getGetCourseConfig } from "@/lib/getcourse";

export async function POST() {
  const session = await requireAdminSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { apiHost, apiKey } = getGetCourseConfig();
    const body = new URLSearchParams({
      action: "get",
      key: apiKey,
    });

    const res = await fetch(`https://${apiHost}/pl/api/account/fields`, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json; q=1.0, */*; q=0.1",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `HTTP ${res.status}: ${res.statusText}` },
        { status: 400 }
      );
    }

    const data = (await res.json()) as {
      success?: boolean;
      info?: unknown[];
      error?: string | boolean;
      error_message?: string;
    };

    if (data.success === false || data.error) {
      return NextResponse.json(
        {
          success: false,
          error:
            (typeof data.error_message === "string" && data.error_message) ||
            (typeof data.error === "string" && data.error) ||
            "GetCourse вернул ошибку",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Соединение с ${apiHost} установлено. Справочник полей получен: ${Array.isArray(data.info) ? data.info.length : 0}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Неизвестная ошибка при подключении к GetCourse";

    if (message === "GETCOURSE_ACCOUNT and GETCOURSE_API_KEY are required") {
      return NextResponse.json(
        {
          success: false,
          error: "GETCOURSE_ACCOUNT или GETCOURSE_API_KEY не настроены в .env",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
