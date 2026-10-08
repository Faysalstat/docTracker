import express from "express";
import * as authController from "../controller/auth-controller";

const router = express.Router();

router.post("/login", authController.login); // public: listed in middleware/public-routes.ts
router.get("/me", authController.getCurrentUser);

export default router;
