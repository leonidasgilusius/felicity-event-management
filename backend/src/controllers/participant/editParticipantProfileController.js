import Participant from "../../models/user/Participant.js";
import bcrypt from "bcrypt";

export async function editParticipantProfile(req, res) {
    try {
        console.log(req.user)
        const participant_id = req.user._id
        const {
            name,
            lastName,
            contactNumber,
            interests,
            followedOrganizers
        } = req.body


        const participant = await Participant.findByIdAndUpdate(participant_id, {
            name,
            lastName,
            contactNumber,
            interests,
            followedOrganizers
        }, { new: true}) 
        
        if (!participant) return res.status(400).json({ message: "participant not found"})
            
        res.status(200).json({
            name: participant.name,
            lastName: participant.lastName,
            contactNumber: participant.contactNumber,
            interests: participant.interests,
            followedOrganizers: participant.followedOrganizers
        })
    } catch (error) {
        console.log(error)
        res.status(500).json( { message: "server error occured while editing participant"})
    }
}

export async function getParticipantProfile(req, res) {
    try {
        const participant = await Participant.findById(req.user._id)
            .select('-password')
            .populate('followedOrganizers', 'name category')
            .lean();
        if (!participant) return res.status(404).json({ message: "Participant not found" });
        res.json({ profile: participant });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
}

export async function changePassword(req, res) {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword)
            return res.status(400).json({ message: "Both current and new password are required." });
        if (newPassword.length < 8)
            return res.status(400).json({ message: "New password must be at least 8 characters." });

        const participant = await Participant.findById(req.user._id);
        if (!participant) return res.status(404).json({ message: "Participant not found." });

        const isMatch = await participant.comparePassword(currentPassword);
        if (!isMatch) return res.status(401).json({ message: "Current password is incorrect." });

        participant.password = newPassword; // pre-save hook will hash it
        await participant.save();

        res.json({ message: "Password changed successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
}