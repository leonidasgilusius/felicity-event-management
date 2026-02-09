import mongoose from "mongoose";

export default async function connectdb() {
    try {
        const database_uri = process.env.MONGO_URI
        if(!database_uri) {
            throw new Error('MONGO_URI is not set');
        }
        await mongoose.connect(database_uri)
        console.log("Database connection was successful")

    } catch (error) {
        console.error(`Database connection failed: ${error.message}`)
        process.exit(1)
    }
}