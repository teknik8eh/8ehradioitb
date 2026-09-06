import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";

// GET - Fetch analytics for a specific short link
export async function GET(req, { params }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "7d"; // 7d, 30d, 90d, all

    // Check if the short link belongs to the user
    const shortLink = await prisma.shortLink.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!shortLink) {
      return NextResponse.json(
        { error: "Short link not found" },
        { status: 404 }
      );
    }

    // Calculate date range based on period
    let dateFilter = {};
    if (period !== "all") {
      const days = parseInt(period.replace("d", ""));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      dateFilter = {
        clickedAt: {
          gte: startDate
        }
      };
    }

    // Get total clicks
    const totalClicks = await prisma.shortLinkClick.count({
      where: {
        shortLinkId: id,
        ...dateFilter
      }
    });

    // Get clicks by date (for chart)
    const clicksByDate = await prisma.shortLinkClick.groupBy({
      by: ["clickedAt"],
      where: {
        shortLinkId: id,
        ...dateFilter
      },
      _count: {
        id: true
      },
      orderBy: {
        clickedAt: "asc"
      }
    });

    // Get recent clicks
    const recentClicks = await prisma.shortLinkClick.findMany({
      where: {
        shortLinkId: id,
        ...dateFilter
      },
      orderBy: {
        clickedAt: "desc"
      },
      take: 10
    });

    // Get top referrers
    const topReferrers = await prisma.shortLinkClick.groupBy({
      by: ["referer"],
      where: {
        shortLinkId: id,
        referer: {
          not: null
        },
        ...dateFilter
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: "desc"
        }
      },
      take: 5
    });

    // Get user agents (browser/device info)
    const topUserAgents = await prisma.shortLinkClick.groupBy({
      by: ["userAgent"],
      where: {
        shortLinkId: id,
        userAgent: {
          not: null
        },
        ...dateFilter
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: "desc"
        }
      },
      take: 5
    });

    // Format clicks by date for chart
    const chartData = clicksByDate.map(item => ({
      date: item.clickedAt.toISOString().split('T')[0],
      clicks: item._count.id
    }));

    // Aggregate data by date (in case of multiple clicks on same day)
    const aggregatedChartData = chartData.reduce((acc, item) => {
      const existing = acc.find(d => d.date === item.date);
      if (existing) {
        existing.clicks += item.clicks;
      } else {
        acc.push(item);
      }
      return acc;
    }, []);

    return NextResponse.json({
      totalClicks,
      chartData: aggregatedChartData,
      recentClicks,
      topReferrers: topReferrers.map(item => ({
        referer: item.referer,
        clicks: item._count.id
      })),
      topUserAgents: topUserAgents.map(item => ({
        userAgent: item.userAgent,
        clicks: item._count.id
      })),
      period
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
} 