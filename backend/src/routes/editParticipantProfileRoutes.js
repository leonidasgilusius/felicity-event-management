import express from "express";
import { editParticipantProfile, getParticipantProfile, changePassword } from "../controllers/editParticipantProfileController.js";

const router = express.Router()

router.get('/', getParticipantProfile)
router.put('/', editParticipantProfile)
router.post('/change-password', changePassword)

export default router