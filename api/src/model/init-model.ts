// Registers every model with Mongoose before any route runs (refs like "doctor" in
// patient.doctorId resolve by name, so the model must be registered for .populate()).
import "./user";
import "./doctor";
import "./patient";
