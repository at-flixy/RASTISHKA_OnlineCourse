type GetCourseOrder = {
  id: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string | null;
  items: Array<{
    product: {
      title: string;
      getcourseGroupName: string | null;
    };
    tariff: {
      name: string;
      getcourseGroupName: string;
    } | null;
  }>;
};

function getGetCourseConfig() {
  const account = process.env.GETCOURSE_ACCOUNT;
  const apiKey = process.env.GETCOURSE_API_KEY;

  if (!account || !apiKey) {
    throw new Error("GETCOURSE_ACCOUNT and GETCOURSE_API_KEY are required");
  }

  return { account, apiKey };
}

function getGroupNames(order: GetCourseOrder) {
  return Array.from(
    new Set(
      order.items
        .map((item) => item.tariff?.getcourseGroupName ?? item.product.getcourseGroupName)
        .filter((groupName): groupName is string => Boolean(groupName))
    )
  );
}

export async function syncCourseAccessToGetCourse(order: GetCourseOrder) {
  const { account, apiKey } = getGetCourseConfig();
  const groupNames = getGroupNames(order);

  if (groupNames.length === 0) {
    throw new Error("GetCourse group is not configured for this product");
  }

  const params = Buffer.from(
    JSON.stringify({
      user: {
        email: order.customerEmail,
        phone: order.customerPhone || undefined,
        first_name: order.customerName,
        group_name: groupNames,
      },
      system: {
        refresh_if_exists: 1,
        return_user_id: "Y",
      },
    })
  ).toString("base64");

  const body = new URLSearchParams({
    action: "add",
    key: apiKey,
    params,
  });

  const response = await fetch(`https://${account}.getcourse.ru/pl/api/users`, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: AbortSignal.timeout(15000),
  });

  const rawBody = await response.text();
  let parsedBody: unknown = rawBody;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    // Keep raw body if GetCourse does not return JSON.
  }

  if (!response.ok) {
    throw new Error(`GetCourse HTTP ${response.status}: ${response.statusText}`);
  }

  if (
    typeof parsedBody === "object" &&
    parsedBody !== null &&
    "success" in parsedBody &&
    parsedBody.success === false
  ) {
    const message =
      "error" in parsedBody && typeof parsedBody.error === "string"
        ? parsedBody.error
        : "GetCourse returned an error";

    throw new Error(message);
  }

  return {
    groupNames,
    response: parsedBody,
  };
}
