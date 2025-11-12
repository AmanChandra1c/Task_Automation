const XLSX = require("xlsx");
const csv = require("csv-parser");
const fs = require("fs");

// Helper function to extract event name from row data
const extractEventName = (row) => {
  // Try various common column name variations
  const eventNameKeys = [
    "Event Name",
    "EventName",
    "eventName",
    "Event",
    "event",
    "EVENT",
    "event name",
    "Event_Name",
    "event_name",
    "EVENT_NAME",
  ];

  for (const key of eventNameKeys) {
    if (row[key] && row[key].toString().trim()) {
      return row[key].toString().trim();
    }
  }

  return "";
};

exports.parseExcel = async (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    return data.map((row) => {
      const participant = {
        name: row.Name || row.name || row.NAME || "",
        email: row.Email || row.email || row.EMAIL || "",
        semester: row.Semester || row.semester || row.SEMESTER || "",
        eventName: extractEventName(row),
        customFields: {},
      };

      // Extract custom fields
      Object.keys(row).forEach((key) => {
        const lowerKey = key
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/_/g, "");
        if (
          !["name", "email", "semester", "event", "eventname"].includes(
            lowerKey
          )
        ) {
          participant.customFields[key] = row[key] || "";
        }
      });

      return participant;
    });
  } catch (error) {
    throw new Error(`Error parsing Excel file: ${error.message}`);
  }
};

exports.parseCSV = async (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        const participant = {
          name: data.Name || data.name || data.NAME || "",
          email: data.Email || data.email || data.EMAIL || "",
          semester: data.Semester || data.semester || data.SEMESTER || "",
          eventName: extractEventName(data),
          customFields: {},
        };

        // Extract custom fields
        Object.keys(data).forEach((key) => {
          const lowerKey = key
            .toLowerCase()
            .replace(/\s+/g, "")
            .replace(/_/g, "");
          if (
            !["name", "email", "semester", "event", "eventname"].includes(
              lowerKey
            )
          ) {
            participant.customFields[key] = data[key] || "";
          }
        });

        results.push(participant);
      })
      .on("end", () => resolve(results))
      .on("error", (error) =>
        reject(new Error(`Error parsing CSV file: ${error.message}`))
      );
  });
};
