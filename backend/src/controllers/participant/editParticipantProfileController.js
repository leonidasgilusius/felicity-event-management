import Participant from "../../models/user/Participant.js";
import bcrypt from "bcrypt";
import Organizer from "../../models/user/Organizer.js";
import mongoose from "mongoose";

function normalizeInterests(interests) {
    if (!Array.isArray(interests)) return [];

    return [...new Set(
        interests
            .map((item) => String(item || '').trim())
            .filter(Boolean)
    )];
}

async function normalizeFollowedOrganizers(followedOrganizers) {
    if (!Array.isArray(followedOrganizers)) return [];

    const validIds = [...new Set(
        followedOrganizers
            .map((id) => String(id || '').trim())
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
    )];

    if (validIds.length === 0) return [];

    const organizerUsers = await Organizer.find({
        _id: { $in: validIds },
        isDisabled: false,
        archived: false,
    }).select('_id').lean();

    return organizerUsers.map((organizer) => organizer._id);
}

export async function editParticipantProfile(req, res) {
    try {
        const participant_id = req.user._id
        const {
            name,
            lastName,
            contactNumber,
            organisation,
            interests,
            followedOrganizers
        } = req.body

        const updateData = {};
        if (name !== undefined) updateData.name = String(name).trim();
        if (lastName !== undefined) updateData.lastName = String(lastName).trim();
        if (contactNumber !== undefined) updateData.contactNumber = String(contactNumber).trim();
        if (organisation !== undefined) updateData.organisation = String(organisation).trim();
        if (interests !== undefined) updateData.interests = normalizeInterests(interests);
        if (followedOrganizers !== undefined) {
            updateData.followedOrganizers = await normalizeFollowedOrganizers(followedOrganizers);
        }

        const participant = await Participant.findByIdAndUpdate(
            participant_id,
            updateData,
            { new: true }
        ).populate('followedOrganizers', 'name category')
        
        if (!participant) return res.status(400).json({ message: "participant not found"})
            
        res.status(200).json({
            name: participant.name,
            lastName: participant.lastName,
            contactNumber: participant.contactNumber,
            organisation: participant.organisation,
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

        participant.password = newPassword; 
        await participant.save();

        res.json({ message: "Password changed successfully." });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
}