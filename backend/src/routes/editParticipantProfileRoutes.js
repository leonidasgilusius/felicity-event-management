import express from "express";
import { editParticipantProfile } from "../controllers/editParticipantProfileController.js";

const router = express.Router()

router.put('/', editParticipantProfile)

export default router