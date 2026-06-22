const express = require("express");
const { StatusCodes } = require("http-status-codes");
const prisma = require("../config/prisma");
const authMiddleware = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const validateRequest = require("../middleware/validateRequest");
const { applyModerationAction, listModerationAlerts } = require("../services/adminAlertService");
const { adminAlertActionSchema } = require("../validators/adminValidator");

const router = express.Router();

router.use(authMiddleware);
router.use(allowRoles("ADMIN"));

router.get("/alerts", async (req, res, next) => {
  try {
    const data = await listModerationAlerts(prisma);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Moderation alerts fetched successfully",
      data
    });
  } catch (error) {
    next(error);
  }
});

router.post("/alerts/:alertId/action", validateRequest(adminAlertActionSchema), async (req, res, next) => {
  try {
    await applyModerationAction(prisma, req.user, req.validated.params.alertId, req.validated.body.action);
    const data = await listModerationAlerts(prisma);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: "Moderation action processed successfully",
      data
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
