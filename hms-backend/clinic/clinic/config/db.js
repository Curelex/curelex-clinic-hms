import mongoose from "mongoose";
import env from "./env.js";

export const clinicConnection = mongoose.createConnection(
    env.clinicMongoUri
);

clinicConnection.on("connected", () => {
    console.log("Clinic DB connected");
});