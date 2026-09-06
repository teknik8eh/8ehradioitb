import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { hasAnyRole } from "@/lib/roleUtils";
import { validateProfileCatalogField } from "@/lib/forms/validate";

const CATALOG_ADMIN_ROLES = ["DATA", "DEVELOPER"];

function requireCatalogAdmin(session) {
  return Boolean(session?.user?.role) && hasAnyRole(session.user.role, CATALOG_ADMIN_ROLES);
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "1";
    const isCatalogAdmin = requireCatalogAdmin(session);

    const fields = await prisma.profileFieldCatalog.findMany({
      where: activeOnly || !isCatalogAdmin ? { isActive: true } : undefined,
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      items: fields,
      isCatalogAdmin,
    });
  } catch (error) {
    console.error("Failed to list profile catalog:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!requireCatalogAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const payload = {
      key: typeof body?.key === "string" ? body.key.trim() : "",
      label: typeof body?.label === "string" ? body.label.trim() : "",
      description:
        typeof body?.description === "string" ? body.description.trim() : null,
      fieldType: typeof body?.fieldType === "string" ? body.fieldType.trim() : "",
      isRequired: Boolean(body?.isRequired),
      options: Array.isArray(body?.options)
        ? body.options.filter((option) => typeof option === "string")
        : null,
      isActive:
        typeof body?.isActive === "boolean" ? body.isActive : true,
      metadata:
        body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
    };

    const validation = validateProfileCatalogField(payload);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "invalid_field", details: validation.errors },
        { status: 400 },
      );
    }

    const created = await prisma.profileFieldCatalog.create({
      data: payload,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Field key already exists" },
        { status: 409 },
      );
    }

    console.error("Failed to create profile catalog field:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!requireCatalogAdmin(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const id = typeof body?.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updates = {};

    if (Object.prototype.hasOwnProperty.call(body, "label")) {
      if (typeof body.label !== "string" || !body.label.trim()) {
        return NextResponse.json(
          { error: "label must be non-empty string" },
          { status: 400 },
        );
      }
      updates.label = body.label.trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, "description")) {
      if (body.description !== null && typeof body.description !== "string") {
        return NextResponse.json(
          { error: "description must be null or string" },
          { status: 400 },
        );
      }
      updates.description =
        typeof body.description === "string" ? body.description.trim() : null;
    }

    if (Object.prototype.hasOwnProperty.call(body, "fieldType")) {
      updates.fieldType = body.fieldType;
    }

    if (Object.prototype.hasOwnProperty.call(body, "isRequired")) {
      updates.isRequired = Boolean(body.isRequired);
    }

    if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
      updates.isActive = Boolean(body.isActive);
    }

    if (Object.prototype.hasOwnProperty.call(body, "options")) {
      if (
        body.options !== null &&
        (!Array.isArray(body.options) ||
          body.options.some((option) => typeof option !== "string"))
      ) {
        return NextResponse.json(
          { error: "options must be null or array of string" },
          { status: 400 },
        );
      }
      updates.options = body.options;
    }

    if (Object.prototype.hasOwnProperty.call(body, "metadata")) {
      if (body.metadata && typeof body.metadata !== "object") {
        return NextResponse.json(
          { error: "metadata must be object" },
          { status: 400 },
        );
      }
      updates.metadata = body.metadata;
    }

    const updated = await prisma.profileFieldCatalog.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update profile catalog field:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
