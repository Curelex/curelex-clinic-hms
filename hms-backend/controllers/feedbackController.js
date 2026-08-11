// hms-backend/controllers/feedbackController.js
import Feedback from '../models/Feedback.js';
import Clinic from '../models/Clinic.js';
import User from '../models/User.js';

export const submitFeedback = async (req, res) => {
  try {
    const { patientId, clinicId, doctorId, clinicRating, doctorRating, clinicFeedback, doctorFeedback } = req.body;

    if (!patientId || !doctorId || !doctorRating) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const feedbackData = {
      patientId,
      doctorId,
      doctorRating,
      clinicFeedback,
      doctorFeedback
    };

    if (clinicId) feedbackData.clinicId = clinicId;
    if (clinicRating) feedbackData.clinicRating = clinicRating;

    const feedback = new Feedback(feedbackData);

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

export const getDoctorFeedback = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const feedbacks = await Feedback.find({ doctorId })
      .populate('patientId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, feedbacks });
  } catch (error) {
    console.error('Error fetching doctor feedback:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── NEW: Get clinic feedback with ratings ──
export const getClinicFeedback = async (req, res) => {
  try {
    const { clinicId } = req.params;
    
    const feedbacks = await Feedback.find({ clinicId })
      .populate('patientId', 'name')
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 });

    // Calculate average rating
    const ratings = feedbacks.map(f => f.clinicRating).filter(r => r > 0);
    const averageRating = ratings.length > 0 
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 
      : 0;

    res.status(200).json({
      success: true,
      feedbacks,
      stats: {
        totalReviews: feedbacks.length,
        averageRating,
        ratingDistribution: {
          5: ratings.filter(r => r === 5).length,
          4: ratings.filter(r => r === 4).length,
          3: ratings.filter(r => r === 3).length,
          2: ratings.filter(r => r === 2).length,
          1: ratings.filter(r => r === 1).length,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching clinic feedback:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── NEW: Get all clinic ratings (for top rated lists) ──
export const getAllClinicRatings = async (req, res) => {
  try {
    // Get all clinics with their feedback aggregated
    const clinics = await Clinic.find({}, '_id name type address');
    
    const clinicRatings = await Promise.all(clinics.map(async (clinic) => {
      const feedbacks = await Feedback.find({ clinicId: clinic._id });
      const ratings = feedbacks.map(f => f.clinicRating).filter(r => r > 0);
      const averageRating = ratings.length > 0 
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 
        : 0;
      
      return {
        _id: clinic._id,
        name: clinic.name,
        type: clinic.type || 'clinic',
        address: clinic.address,
        rating: averageRating,
        reviews: ratings.length,
        totalRatings: ratings.length,
      };
    }));

    // Sort by rating (highest first)
    clinicRatings.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);

    res.status(200).json({
      success: true,
      clinics: clinicRatings,
    });
  } catch (error) {
    console.error('Error fetching clinic ratings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};