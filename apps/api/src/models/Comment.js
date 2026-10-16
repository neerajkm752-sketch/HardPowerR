import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  comment: { type: String, required: true, trim: true, maxlength: 800 },
  createdAt: { type: Date, default: Date.now }
});

export const Comment = mongoose.models.Comment || mongoose.model("Comment", commentSchema);
