const Participant = require("../models/Participant");
const Event = require("../models/Event");
const EmailTemplate = require("../models/EmailTemplate");
const Certificate = require("../models/Certificate");
const ScheduledEmail = require("../models/ScheduledEmail");

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    // Total participants
    const totalParticipants = await Participant.countDocuments();

    // Participants per semester
    const participantsBySemester = await Participant.aggregate([
      {
        $group: {
          _id: "$semester",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Emails sent count
    const emailsSent = await Participant.countDocuments({ emailSent: true });

    // Certificate delivery success rate
    const certificatesSent = await Participant.countDocuments({
      certificateSent: true,
    });
    const certificateSuccessRate =
      totalParticipants > 0
        ? ((certificatesSent / totalParticipants) * 100).toFixed(2)
        : 0;

    // Event participation trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const eventTrends = await Event.aggregate([
      {
        $match: {
          date: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          count: { $sum: 1 },
          participants: { $sum: { $size: "$participants" } },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // Total events
    const totalEvents = await Event.countDocuments();

    // Total templates
    const totalTemplates = await EmailTemplate.countDocuments();

    // Total certificates
    const totalCertificates = await Certificate.countDocuments();

    // Scheduled emails
    const scheduledEmails = await ScheduledEmail.countDocuments({
      status: "pending",
    });

    res.status(200).json({
      success: true,
      data: {
        totalParticipants,
        participantsBySemester,
        emailsSent,
        certificatesSent,
        certificateSuccessRate: parseFloat(certificateSuccessRate),
        eventTrends,
        totalEvents,
        totalTemplates,
        totalCertificates,
        scheduledEmails,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
