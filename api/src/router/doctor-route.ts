import express from "express";
import * as doctorController from "../controller/doctor-controller";

const router = express.Router();

router.post("/create", doctorController.createDoctor);
router.get("/list", doctorController.listDoctors);
router.get("/options", doctorController.listDoctorOptions);
router.get("/hospitals", doctorController.listHospitals);
router.get("/getbyid", doctorController.getDoctorById); // id via req.query
router.put("/update/:id", doctorController.updateDoctor); // id via req.params

export default router;
