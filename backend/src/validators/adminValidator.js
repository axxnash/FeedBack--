const { z } = require("zod");

const moderationActions = [
  "TAKE_DOWN_LISTING",
  "WARN_USER",
  "BAN_USER",
  "DISMISS_ALERT"
];

const adminAlertActionSchema = z.object({
  body: z.object({
    action: z.enum(moderationActions)
  }),
  params: z.object({
    alertId: z.string().trim().min(1, "Alert id is required")
  }),
  query: z.object({}).optional()
});

module.exports = {
  adminAlertActionSchema
};
