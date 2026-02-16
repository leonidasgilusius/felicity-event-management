import Participant from "../models/Participant.js";

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