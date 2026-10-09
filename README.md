# Curelex HMS

**Curelex HMS** is a full-stack Healthcare Management System built on the MERN stack (MongoDB, Express.js, React, Node.js). It powers [Curelex](https://curelex.in), a hybrid e-clinic platform that brings quality healthcare closer to patients by connecting them with clinics, doctors, and specialists, both online and in person.

Live site: **https://curelex.in**

---

## About the Project

Access to good healthcare is uneven, especially in rural and semi-urban areas. Curelex tackles this with a hybrid model: physical micro-clinics where patients get an initial assessment and basic tests, combined with virtual consultations with specialist doctors. This repository contains the web platform that ties the whole experience together for patients, doctors, and clinics.

## Key Features

### For Patients
- **Nearby clinics and hospitals**: find clinics and hospitals around you using location access.
- **Online appointment booking**: pick a doctor, choose a time slot, and book in a few clicks.
- **Video consultation**: consult a doctor remotely from home.
- **In-person (face-to-face) consultation**: book a physical visit at a clinic.
- **Patient profile and history**: view past appointments and prescriptions.

### For Doctors
- Manage availability and appointment slots.
- Accept, reschedule, or cancel appointments.
- Conduct video consultations and in-person visits.
- View patient details and consultation history.

### For Clinics / Admin
- Register and manage clinics and doctors.
- Monitor appointments and overall activity.
- Role-based access for patients, doctors, and admins.

## Tech Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Frontend   | React.js                                |
| Backend    | Node.js, Express.js                     |
| Database   | MongoDB (Mongoose)                      |
| Auth       | JWT (JSON Web Tokens)                   |
| Location   | Browser Geolocation API                 |

## Project Structure

```
curelex-clinic-hms/
├── hms-backend/     # Node.js + Express REST API
├── hms-react/       # React frontend
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or later
- [MongoDB](https://www.mongodb.com/) (local installation or MongoDB Atlas)
- npm or yarn

### 1. Clone the repository

```bash
git clone https://github.com/Curelex/curelex-clinic-hms.git
cd curelex-clinic-hms
```

### 2. Set up the backend

```bash
cd hms-backend
npm install
```

Create a `.env` file inside `hms-backend/`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Start the server:

```bash
npm start
```

### 3. Set up the frontend

```bash
cd ../hms-react
npm install
```

Create a `.env` file inside `hms-react/`:

```env
REACT_APP_API_URL=http://localhost:5000
```

Start the app:

```bash
npm start
```

The frontend runs at `http://localhost:3000` and the backend at `http://localhost:5000`.

## How It Works

1. A patient signs up and allows location access.
2. The app shows nearby clinics and hospitals.
3. The patient picks a doctor and books an appointment, either **online (video)** or **in person**.
4. The doctor confirms and holds the consultation.
5. The patient can review the consultation details afterwards.

## Roadmap

- [ ] Online payments for consultations
- [ ] Prescription download (PDF)
- [ ] SMS / email appointment reminders
- [ ] Diagnostic test booking
- [ ] Subscription plans
- [ ] Multi-language support

## Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push the branch: `git push origin feature/your-feature`
5. Open a Pull Request

## License

This project is proprietary to Curelex. Add a license here if you plan to open-source it.

## Contact

- Website: [curelex.in](https://curelex.in)
- GitHub: [Curelex](https://github.com/Curelex)

---

*Curelex: quality healthcare, closer to you.*
