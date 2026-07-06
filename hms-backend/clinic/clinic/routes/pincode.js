import express from 'express';
import axios from 'axios';
import https from 'https';

const router = express.Router();

router.get('/:pincode', async (req, res) => {
  try {

    const { pincode } = req.params;

    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        message: 'Invalid pincode'
      });
    }

    const response = await axios.get(
      `https://api.postalpincode.in/pincode/${pincode}`,
      {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
      }
    );

    res.json(response.data);

  } catch (err) {

    console.error('PINCODE ERROR:', err);

    res.status(500).json({
      message: err.message
    });

  }
});

export default router;

