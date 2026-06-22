const { StatusCodes } = require("http-status-codes");
const ApiError = require("../utils/apiError");
const { createNotification } = require("./notificationService");

const ISSUE_TITLE_PROHIBITED_ITEM = "Prohibited Item Category";
const FLAGGED_KEYWORDS = [
  "prescription",
  "medical supplies",
  "medicine",
  "drug",
  "alcohol",
  "tobacco",
  "vape",
  "weapon"
];

const mapAlert = (alert) => ({
  id: alert.id,
  targetType: alert.targetType,
  targetId: alert.targetId,
  targetUserId: alert.targetUserId,
  targetName: alert.targetName,
  severity: alert.severity,
  status: alert.status,
  issueTitle: alert.issueTitle,
  description: alert.description,
  reporterName: alert.reporterName,
  actionNotes: alert.actionNotes,
  createdAt: alert.createdAt,
  updatedAt: alert.updatedAt,
  resolvedAt: alert.resolvedAt
});

const listModerationAlerts = async (prismaClient) => {
  await syncSystemModerationAlerts(prismaClient);

  const alerts = await prismaClient.moderationAlert.findMany({
    where: {
      status: "OPEN"
    },
    orderBy: [
      {
        severity: "desc"
      },
      {
        createdAt: "desc"
      }
    ]
  });

  return {
    alerts: alerts.map(mapAlert)
  };
};

const syncSystemModerationAlerts = async (prismaClient) => {
  const listings = await prismaClient.listing.findMany({
    where: {
      status: {
        in: ["AVAILABLE", "CLAIMED", "PICKED_UP"]
      }
    },
    include: {
      vendor: {
        select: {
          id: true,
          name: true,
          vendorBusinessName: true
        }
      }
    }
  });

  const flaggedListings = listings.filter((listing) => {
    const searchableText = `${listing.title} ${listing.description}`.toLowerCase();
    return FLAGGED_KEYWORDS.some((keyword) => searchableText.includes(keyword));
  });

  if (!flaggedListings.length) {
    return;
  }

  const existingAlerts = await prismaClient.moderationAlert.findMany({
    where: {
      targetType: "LISTING",
      targetId: {
        in: flaggedListings.map((listing) => listing.id)
      },
      issueTitle: ISSUE_TITLE_PROHIBITED_ITEM
    },
    select: {
      targetId: true
    }
  });

  const existingTargetIds = new Set(existingAlerts.map((alert) => alert.targetId));
  const alertsToCreate = flaggedListings
    .filter((listing) => !existingTargetIds.has(listing.id))
    .map((listing) => ({
      targetType: "LISTING",
      targetId: listing.id,
      targetUserId: listing.vendorId,
      targetName: listing.title,
      severity: "HIGH",
      issueTitle: ISSUE_TITLE_PROHIBITED_ITEM,
      description:
        "This listing appears to contain restricted or prohibited item keywords and requires an administrator review before it stays visible on the platform.",
      reporterName: "System Flag (Automated Keyword)"
    }));

  if (alertsToCreate.length) {
    await prismaClient.moderationAlert.createMany({
      data: alertsToCreate
    });
  }
};

const applyModerationAction = async (prismaClient, adminUser, alertId, action) => {
  const alert = await prismaClient.moderationAlert.findUnique({
    where: {
      id: alertId
    }
  });

  if (!alert || alert.status !== "OPEN") {
    throw new ApiError(StatusCodes.NOT_FOUND, "Open moderation alert not found");
  }

  switch (action) {
    case "TAKE_DOWN_LISTING":
      return takeDownListingAlert(prismaClient, adminUser, alert);
    case "WARN_USER":
      return warnAlertTarget(prismaClient, adminUser, alert);
    case "BAN_USER":
      return restrictAlertTarget(prismaClient, adminUser, alert);
    case "DISMISS_ALERT":
      return dismissAlert(prismaClient, adminUser, alert);
    default:
      throw new ApiError(StatusCodes.BAD_REQUEST, "Unsupported moderation action");
  }
};

const takeDownListingAlert = async (prismaClient, adminUser, alert) =>
  prismaClient.$transaction(async (tx) => {
    if (alert.targetType !== "LISTING") {
      throw new ApiError(StatusCodes.BAD_REQUEST, "This alert does not target a listing");
    }

    const listing = await tx.listing.findUnique({
      where: {
        id: alert.targetId
      }
    });

    if (!listing) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Listing not found");
    }

    await tx.listing.update({
      where: {
        id: listing.id
      },
      data: {
        status: "EXPIRED",
        quantity: 0,
        expiryAt: new Date()
      }
    });

    if (listing.vendorId) {
      await createNotification(tx, {
        userId: listing.vendorId,
        type: "STATUS_UPDATE",
        title: "Listing removed by admin",
        message: `${listing.title} was removed after an administrative compliance review.`,
        link: "/vendor/listings"
      });
    }

    return tx.moderationAlert.update({
      where: {
        id: alert.id
      },
      data: {
        status: "RESOLVED",
        actionedById: adminUser.id,
        actionNotes: "Listing removed from circulation by admin action.",
        resolvedAt: new Date()
      }
    });
  });

const warnAlertTarget = async (prismaClient, adminUser, alert) =>
  prismaClient.$transaction(async (tx) => {
    const target = await resolveAlertTarget(tx, alert);

    if (!target.userId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "This alert has no user to warn");
    }

    await createNotification(tx, {
      userId: target.userId,
      type: "STATUS_UPDATE",
      title: "Administrative warning issued",
      message: `An administrator flagged ${alert.targetName} for review. Please check your account content and stay within platform guidelines.`,
      link: target.link
    });

    return tx.moderationAlert.update({
      where: {
        id: alert.id
      },
      data: {
        status: "RESOLVED",
        actionedById: adminUser.id,
        actionNotes: "Warning notification sent to the target user.",
        resolvedAt: new Date()
      }
    });
  });

const restrictAlertTarget = async (prismaClient, adminUser, alert) =>
  prismaClient.$transaction(async (tx) => {
    const target = await resolveAlertTarget(tx, alert);

    if (!target.userId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "This alert has no user to restrict");
    }

    const user = await tx.user.findUnique({
      where: {
        id: target.userId
      }
    });

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Target user not found");
    }

    if (!["NGO", "VENDOR", "RIDER"].includes(user.role)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Only NGO, vendor, and rider accounts can be restricted by this action"
      );
    }

    await tx.user.update({
      where: {
        id: user.id
      },
      data: {
        approvalStatus: "REJECTED",
        approvalNotes: "Restricted by administrator through moderation controls.",
        approvedAt: null
      }
    });

    if (user.role === "VENDOR") {
      await tx.listing.updateMany({
        where: {
          vendorId: user.id,
          status: "AVAILABLE"
        },
        data: {
          status: "EXPIRED",
          quantity: 0,
          expiryAt: new Date()
        }
      });
    }

    await createNotification(tx, {
      userId: user.id,
      type: "STATUS_UPDATE",
      title: "Account restricted by admin",
      message: "Your account has been restricted after an administrative moderation review. Contact support if you believe this was a mistake.",
      link: "/me"
    });

    return tx.moderationAlert.update({
      where: {
        id: alert.id
      },
      data: {
        status: "RESOLVED",
        actionedById: adminUser.id,
        actionNotes: "Account restricted and alert resolved by admin.",
        resolvedAt: new Date()
      }
    });
  });

const dismissAlert = (prismaClient, adminUser, alert) =>
  prismaClient.moderationAlert.update({
    where: {
      id: alert.id
    },
    data: {
      status: "DISMISSED",
      actionedById: adminUser.id,
      actionNotes: "Alert dismissed by administrator.",
      resolvedAt: new Date()
    }
  });

const resolveAlertTarget = async (prismaClient, alert) => {
  if (alert.targetType === "USER") {
    return {
      userId: alert.targetUserId || alert.targetId,
      link: "/me"
    };
  }

  const listing = await prismaClient.listing.findUnique({
    where: {
      id: alert.targetId
    },
    select: {
      id: true,
      vendorId: true
    }
  });

  return {
    userId: listing?.vendorId || alert.targetUserId || null,
    link: "/vendor/listings"
  };
};

module.exports = {
  applyModerationAction,
  listModerationAlerts,
  syncSystemModerationAlerts
};
