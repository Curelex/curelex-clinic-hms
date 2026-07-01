// hms-backend/controllers/feedbackController.js
import Feedback from '../models/Feedback.js';
import Clinic from '../models/Clinic.js';
import User from '../models/User.js';

export const submitFeedback = async (req, res) => {
  try {
    const { patientId, clinicId, doctorId, clinicRating, doctorRating, clinicFeedback, doctorFeedback } = req.body;

    if (!patientId || !clinicId || !doctorId || !clinicRating || !doctorRating) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const feedback = new Feedback({
      patientId,
      clinicId,
      doctorId,
      clinicRating,
      doctorRating,
      clinicFeedback,
      doctorFeedback
    });

    await feedback.save();

    res.status(201).json({ success: true, message: 'Feedback submitted successfully.', feedback });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getPatientFeedback = async (req, res) => {
  try {
    const { patientId } = req.params;
    const feedbacks = await Feedback.find({ patientId })
      .populate('clinicId', 'name')
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, feedbacks });
  } catch (error) {
    console.error('Error fetching patient feedback:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
