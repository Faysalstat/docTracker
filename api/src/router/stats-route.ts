import express from "express";
import * as statsController from "../controller/stats-controller";

const router = express.Router();

router.get("/summary", statsController.getSummary);
router.get("/patients-per-doctor", statsController.getPatientsPerDoctor);
router.get("/admissions", statsController.getAdmissions);
router.get("/conditions", statsController.getConditions);

export default router;
