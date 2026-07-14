// hms-react/src/pages/About.jsx
import { useNavigate } from 'react-router-dom';
import shriyanshImg from "../../assets/Shriyansh Singh-Photoroom (1).png";
import amanImg from "../../assets/Aman Maurya-Photoroom.png";

const TEAM = [
  {
    name: 'Shriyansh Singh',
    role: 'Founder & CEO',
    focus: 'Leads vision, strategy, and innovation.',
    img: shriyanshImg
  },
  {
    name: 'Aman Maurya',
    role: 'Co-Founder & COO',
    focus: 'Oversees operations and execution.',
    img: amanImg
  },
];

const VALUES = [
  { title: 'Our Vision', desc: 'To simplify healthcare journeys with smart digital solutions.' },
  { title: 'Patient First', desc: 'Every feature is built around improving patient experience.' },
  { title: 'Connected Care', desc: 'We connect doctors, hospitals, and patients seamlessly.' },
];

export default function About() {
  const navigate = useNavigate();

  return (
    <>
      <style>{`
        .about-wrapper {
          font-family: 'Poppins', sans-serif;
          margin: 0;
          min-height: 100vh;
          background: #f9fafb;
          color: #1f2937;
        }

        .about-container {
          max-width: 1100px;
          margin: 0 auto;
          padding: 80px 20px 60px;
          position: relative;
        }

        .about-back-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: #2563eb;
          color: white;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          font-family: 'Poppins', sans-serif;
          white-space: nowrap;
          transition: background 0.2s, transform 0.2s;
          z-index: 10;
        }

        .about-back-btn:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
        }

        /* Hero */
        .about-hero {
          text-align: center;
          margin-bottom: 50px;
          padding-top: 10px;
        }

        .about-hero h1 {
          font-size: clamp(32px, 6vw, 48px);
          font-weight: 700;
          color: #111827;
          margin-bottom: 16px;
        }

        .about-hero h1 span {
          color: #2563eb;
        }

        .about-hero p {
          max-width: 700px;
          margin: 0 auto;
          color: #6b7280;
          line-height: 1.8;
          font-size: clamp(14px, 3.5vw, 17px);
        }

        /* Values grid */
        .about-values-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 60px;
        }

        .about-value-card {
          background: white;
          padding: 28px 24px;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          transition: box-shadow 0.3s, transform 0.3s;
        }

        .about-value-card:hover {
          box-shadow: 0 8px 30px rgba(37, 99, 235, 0.1);
          transform: translateY(-4px);
        }

        .about-value-card h2 {
          color: #2563eb;
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 8px;
        }

        .about-value-card p {
          margin: 0;
          font-size: 14px;
          color: #4b5563;
          line-height: 1.7;
        }

        /* Team section */
        .about-team-section {
          text-align: center;
        }

        .about-team-section h2 {
          font-size: clamp(26px, 5vw, 34px);
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
        }

        .about-team-section > p {
          color: #6b7280;
          margin-bottom: 32px;
          font-size: clamp(14px, 3.5vw, 16px);
        }

        .about-team-grid {
          display: flex;
          justify-content: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        .about-team-card {
          background: white;
          padding: 24px 20px;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          text-align: center;
          transition: box-shadow 0.3s, transform 0.3s;
          width: 420px;   
          max-width: 100%;
        }

        .about-team-card:hover {
          box-shadow: 0 8px 30px rgba(37, 99, 235, 0.1);
          transform: translateY(-4px);
        }

        .about-team-card img {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          object-fit: cover;
          margin-bottom: 12px;
          border: 3px solid #e5e7eb;
          transition: border-color 0.3s;
          display: block;
          margin: 0 auto 12px;
        }

        .about-team-card:hover img {
          border-color: #2563eb;
        }

        .about-team-card h3 {
          margin: 6px 0 4px;
          font-size: 16px;
          font-weight: 600;
          color: #111827;
        }

        .about-team-card .role {
          color: #2563eb;
          font-weight: 500;
          font-size: 13px;
          margin: 4px 0;
        }

        .about-team-card .focus {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }

        /* Footer */
        .about-footer {
          background: #111827;
          padding: 24px;
          margin-top: 60px;
        }

        .about-footer div {
          text-align: center;
          font-size: 14px;
          color: #9ca3af;
        }

        /* ── Tablet ── */
        @media (max-width: 768px) {
          .about-container {
            padding: 70px 16px 40px;
          }

          .about-values-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .about-team-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }

          .about-team-card img {
            width: 72px;
            height: 72px;
          }
        }

        /* ── Mobile ── */
        @media (max-width: 480px) {
          .about-container {
            padding: 60px 14px 36px;
          }

          .about-back-btn {
            top: 14px;
            right: 14px;
            padding: 6px 12px;
            font-size: 12px;
          }

          .about-hero {
            margin-bottom: 32px;
          }

          .about-values-grid {
            margin-bottom: 32px;
          }

          .about-team-scroll-wrapper {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            margin: 0 -14px;
            padding: 0 14px 12px;
            scrollbar-width: none;
          }

          .about-team-scroll-wrapper::-webkit-scrollbar {
            display: none;
          }

          .about-team-grid {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            gap: 12px;
            width: max-content;
          }

          .about-team-card {
            width: 180px;
            flex-shrink: 0;
            padding: 18px 14px;
            border-radius: 16px;
          }

          .about-team-card img {
            width: 72px;
            height: 72px;
          }

          .about-team-card h3 {
            font-size: 14px;
          }

          .about-team-card .role {
            font-size: 12px;
          }

          .about-team-card .focus {
            font-size: 12px;
          }
        }

        /* Dark theme support */
        [data-theme="dark"] .about-wrapper {
          background: #111827;
        }

        [data-theme="dark"] .about-hero h1 {
          color: #f1f5f9;
        }

        [data-theme="dark"] .about-hero p {
          color: #94a3b8;
        }

        [data-theme="dark"] .about-value-card {
          background: #1e293b;
          border-color: #334155;
        }

        [data-theme="dark"] .about-value-card h2 {
          color: #60a5fa;
        }

        [data-theme="dark"] .about-value-card p {
          color: #94a3b8;
        }

        [data-theme="dark"] .about-team-card {
          background: #1e293b;
          border-color: #334155;
        }

        [data-theme="dark"] .about-team-card h3 {
          color: #f1f5f9;
        }

        [data-theme="dark"] .about-team-card .focus {
          color: #94a3b8;
        }

        [data-theme="dark"] .about-team-section > p {
          color: #94a3b8;
        }

        [data-theme="dark"] .about-team-card img {
          border-color: #334155;
        }

        [data-theme="dark"] .about-team-card:hover img {
          border-color: #60a5fa;
        }
      `}</style>

      <div className="about-wrapper">
        <div className="about-container">
          <button className="about-back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>

          <section className="about-hero">
            <h1>About <span>Curelex</span></h1>
            <p>
              At Curelex, we are building a smarter, more connected healthcare ecosystem.
              Our mission is to make quality healthcare accessible, transparent, and continuous for everyone.
              By integrating technology with clinical expertise, we bridge the gap between patients,
              doctors, and healthcare infrastructure.
            </p>
          </section>

          <section className="about-values-grid">
            {VALUES.map((c) => (
              <div key={c.title} className="about-value-card">
                <h2>{c.title}</h2>
                <p>{c.desc}</p>
              </div>
            ))}
          </section>

          <section className="about-team-section">
            <h2>Meet the Leadership</h2>
            <p>A multidisciplinary team driving innovation in healthcare.</p>
            <div className="about-team-scroll-wrapper">
              <div className="about-team-grid">
                {TEAM.map((m) => (
                  <div key={m.name} className="about-team-card">
                    <img src={m.img} alt={m.name} />
                    <h3>{m.name}</h3>
                    <p className="role">{m.role}</p>
                    <p className="focus">{m.focus}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <footer className="about-footer">
          <div>© 2026 Curelex. All rights reserved.</div>
        </footer>
      </div>
    </>
  );
}