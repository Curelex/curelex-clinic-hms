import OTRoom from '../models/ot/OTRoom.js';
import { logOTAction } from '../utils/otAuditLogger.js';

export const getOTRooms = async (req, res) => {
  try {
    const { clinicId } = req.user;
    const rooms = await OTRoom.find({ clinicId }).sort({ name: 1 });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching OT rooms' });
  }
};

export const createOTRoom = async (req, res) => {
  try {
    const { clinicId, id: userId } = req.user;
    const { name, location, equipmentTags } = req.body;

    const existing = await OTRoom.findOne({ clinicId, name });
    if (existing) return res.status(400).json({ message: 'OT Room name already exists' });

    const room = await OTRoom.create({ clinicId, name, location, equipmentTags });
    
    await logOTAction({
      entityType: 'OTRoom',
      entityId: room._id,
      action: 'CREATED',
      actor: userId,
      details: { name, location, equipmentTags }
    });

    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: 'Error creating OT room' });
  }
};

export const updateOTRoom = async (req, res) => {
  try {
    const { clinicId, id: userId } = req.user;
    const { id } = req.params;
    
    if (req.body.name) {
      const existing = await OTRoom.findOne({ clinicId, name: req.body.name, _id: { $ne: id } });
      if (existing) return res.status(400).json({ message: 'OT Room name already exists' });
    }

    const room = await OTRoom.findOneAndUpdate(
      { _id: id, clinicId },
      req.body,
      { new: true }
    );
    
    if (!room) return res.status(404).json({ message: 'Room not found' });

    await logOTAction({
      entityType: 'OTRoom',
      entityId: room._id,
      action: 'UPDATED',
      actor: userId,
      details: req.body
    });

    res.json(room);
  } catch (err) {
    res.status(500).json({ message: 'Error updating OT room' });
  }
};
