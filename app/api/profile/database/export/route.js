import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { hasAnyRole } from "@/lib/roleUtils";
import {
  applyProfileFilters,
  buildKruDatabaseRowsForExport,
  buildProfileFieldDefinitions,
} from "@/lib/profile/database";
import { resolveR2DownloadUrl } from "@/lib/storage/r2";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasAnyRole(session.user.role, ["DATA", "DEVELOPER"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const role = (searchParams.get("role") || "").trim().toUpperCase();
    const completeness = (searchParams.get("completeness") || "all").trim();
    const fieldKey = (searchParams.get("fieldKey") || "").trim();
    const fieldValue = (searchParams.get("fieldValue") || "").trim();

    const [catalogFields, profiles] = await Promise.all([
      prisma.profileFieldCatalog.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          key: true,
          label: true,
          fieldType: true,
          isRequired: true,
          isActive: true,
        },
      }),
      prisma.participantProfile.findMany({
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    const fieldDefinitions = buildProfileFieldDefinitions({
      catalogFields,
      profiles,
      includeUnknownProfileKeys: false,
    });
    const allowedFieldKeySet = new Set(fieldDefinitions.map((field) => field.key));

    const requiredKeys = catalogFields
      .filter((field) => field.isActive && field.isRequired)
      .map((field) => field.key);

    const filtered = applyProfileFilters({
      profiles,
      q,
      role,
      completeness:
        completeness === "complete" || completeness === "incomplete"
          ? completeness
          : "all",
      fieldKey: allowedFieldKeySet.has(fieldKey) ? fieldKey : "",
      fieldValue,
      requiredKeys,
    });

    const rows = await buildKruDatabaseRowsForExport({
      profiles: filtered,
      fieldDefinitions,
      resolveFileUrl: (key) => resolveR2DownloadUrl(key, { forceDownload: true }),
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Kru Database");
    const xlsxBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(xlsxBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="kru-database-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Failed to export kru database to xlsx:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 },
    );
  }
}
