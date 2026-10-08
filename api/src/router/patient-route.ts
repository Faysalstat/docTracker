import express from "express";
import * as patientController from "../controller/patient-controller";

const router = express.Router();

router.post("/create", patientController.createPatient);
router.get("/list", patientController.listPatients); // optional ?doctorId= for one doctor's patients
router.get("/getbyid", patientController.getPatientById); // id via req.query
router.put("/update/:id", patientController.updatePatient); // id via req.params
router.delete("/delete/:id", patientController.deletePatient);

export default router;
