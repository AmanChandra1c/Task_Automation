const Participant = require("../models/Participant");
const Event = require("../models/Event");
const { parseExcel, parseCSV } = require("../utils/excelParser");
const path = require("path");
const ActivityLog = require("../models/ActivityLog");
const certificateHelper = require("../utils/certificateHelper");

// ✅ Convert "1st", "2nd", "3rd" → 1, 2, 3
function convertSemester(value) {
  if (!value) return null;
  const match = value.toString().match(/^(\d+)/);
  return match ? parseInt(match[1]) : value;
}

// @desc    Upload and parse Excel file
// @route   POST /api/excel/upload
// @access  Private/Admin
exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file",
      });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let participants = [];

    // Parse file based on extension
    if (fileExtension === ".csv") {
      participants = await parseCSV(filePath);
    } else {
      participants = await parseExcel(filePath);
    }

    const savedParticipants = [];
    const eventParticipantsMap = new Map();

    for (const participantData of participants) {
      if (participantData.email && participantData.name) {
        let eventId = req.body.eventId || null;

        // If event name is provided in the sheet, try to find the event
        if (participantData.eventName && participantData.eventName.trim()) {
          const event = await Event.findOne({
            name: {
              $regex: new RegExp(`^${participantData.eventName.trim()}$`, "i"),
            },
          });
          if (event) {
            eventId = event._id;
          }
        }

        // Skip if event not found
        if (!eventId) {
          console.log(
            `⚠️ Skipping participant ${participantData.name} — event not found`
          );
          continue;
        }

        // Remove eventName since it's not part of the model
        const { eventName, ...participantFields } = participantData;

        // ✅ Convert semester to integer if needed
        if (participantFields.semester) {
          participantFields.semester = convertSemester(
            participantFields.semester
          );
        }

        // Check for duplicates
        const existingParticipant = await Participant.findOne({
          email: participantData.email.trim().toLowerCase(),
          eventId: eventId,
        });

        if (existingParticipant) {
          console.log(
            `⚠️ Duplicate found: ${participantData.email} already registered for this event. Skipping.`
          );
          continue;
        }

        // Save participant
        const participant = await Participant.create({
          ...participantFields,
          uploadedBy: req.user._id,
          eventId: eventId,
        });

        savedParticipants.push(participant);

        // Track participants per event
        if (eventId) {
          if (!eventParticipantsMap.has(eventId.toString())) {
            eventParticipantsMap.set(eventId.toString(), []);
          }
          eventParticipantsMap.get(eventId.toString()).push(participant._id);
        }
      }
    }

    // ✅ For each event, update participants and handle certificate generation
    for (const [eventId, participantIds] of eventParticipantsMap.entries()) {
      const event = await Event.findById(eventId);
      if (event) {
        const existingParticipants = event.participants.map((p) =>
          p.toString()
        );
        const newParticipants = participantIds
          .map((id) => id.toString())
          .filter((id) => !existingParticipants.includes(id));

        if (newParticipants.length > 0) {
          event.participants = [...event.participants, ...newParticipants];
          await event.save();

          // ✅ Generate certificates (asynchronously)
          certificateHelper
            .generateCertificatesForNewParticipants(eventId, participantIds)
            .then((result) => {
              if (result.success) {
                if (result.successful > 0) {
                  console.log(
                    `[Excel Upload] ✅ ${result.successful} certificate(s) generated for event: ${event.name}`
                  );
                } else if (result.scheduled) {
                  console.log(
                    `[Excel Upload] 🕒 Certificates scheduled at 10:30 PM on event day for: ${event.name}`
                  );
                }
              }
            })
            .catch((error) => {
              console.error(
                `[Excel Upload] ❌ Error generating certificates for new participants:`,
                error
              );
            });
        }
      }
    }

    // Emit socket notification (if available)
    const io = req.app.get("io");
    if (io) {
      io.emit("fileUploadCompleted", {
        message: `File uploaded successfully. ${savedParticipants.length} participants added.`,
        count: savedParticipants.length,
        userId: req.user._id,
      });
    }

    // Log upload activity
    await ActivityLog.create({
      userId: req.user._id,
      action: "Excel file uploaded",
      details: {
        filename: req.file.originalname,
        participantsCount: savedParticipants.length,
      },
      status: 200,
    });

    res.status(200).json({
      success: true,
      message: `File uploaded successfully. ${savedParticipants.length} participants added.`,
      count: savedParticipants.length,
      data: savedParticipants,
    });
  } catch (error) {
    console.error("❌ Upload Excel Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error during upload",
    });
  }
};

// @desc    Get all participants
// @route   GET /api/excel/participants
// @access  Private
exports.getParticipants = async (req, res) => {
  try {
    const { eventId, semester, page, limit } = req.query;
    const query = {};

    if (eventId) query.eventId = eventId;
    if (semester) query.semester = convertSemester(semester);

    let participantsQuery = Participant.find(query)
      .populate("eventId", "name")
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    // Apply pagination only if both page & limit are provided
    if (page && limit) {
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      participantsQuery = participantsQuery
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum);
    }

    const participants = await participantsQuery;
    const total = await Participant.countDocuments(query);

    res.status(200).json({
      success: true,
      count: participants.length,
      total,
      page: page ? parseInt(page) : 1,
      pages: limit ? Math.ceil(total / limit) : 1,
      data: participants,
    });
  } catch (error) {
    console.error("❌ Error fetching participants:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

// @desc    Get single participant
// @route   GET /api/excel/participants/:id
// @access  Private
exports.getParticipant = async (req, res) => {
  try {
    const participant = await Participant.findById(req.params.id)
      .populate("eventId", "name")
      .populate("uploadedBy", "name email");

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

    res.status(200).json({
      success: true,
      data: participant,
    });
  } catch (error) {
    console.error("❌ Error fetching participant:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
