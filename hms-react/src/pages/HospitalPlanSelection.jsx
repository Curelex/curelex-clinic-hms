// hms-react/src/pages/HospitalPlanSelection.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';

const C = {
  brand: '#0a3d62', 
  brandMid: '#1565a8', 
  accent: '#00b894', 
  accentLight: '#00cec9',
  textDark: '#0a3d62', 
  textMuted: '#4a6278', 
  textLight: '#8fa8bc',
  border: '#d0dce8', 
  white: '#ffffff',
};

// ── Hospital Plans: Standard and Enterprise ──
const HOSPITAL_PLANS = [
  {
    key: 'standard', 
    name: 'Standard Hospital Plan', 
    tagline: 'Complete hospital management with essential features', 
    price: 4999,
    icon: '🏥', 
    badge: 'Most Popular', 
    bestFor: 'Medium Hospitals, Multi-Department Centers',
    color: '#1565a8', 
    colorLight: 'rgba(21,101,168,0.08)', 
    gradFrom: '#0a3d62', 
    gradTo: '#1565a8', 
    shadow: 'rgba(10,61,98,0.28)',
    features: [
      'Multi-Department Management',
      'Patient Registration & Records',
      'IPD / Admission Management',
      'Emergency Department',
      'Bed Management',
      'Billing & Invoicing',
      'Pharmacy Management',
      'Lab Tests & Reports',
      'Prescriptions',
      'Telemedicine',
      'Task Allocation',
      'Revenue Reports',
      'Up to 20 Doctors',
      'Up to 50 Staff',
      'Up to 50 Beds',
    ],
  },
  {
    key: 'enterprise', 
    name: 'Enterprise Hospital Plan', 
    tagline: 'Complete smart hospital ecosystem with advanced features', 
    price: 6999,
    icon: '⭐', 
    badge: 'Most Advanced', 
    bestFor: 'Large Hospitals, Multi-Specialty Centers, Medical Colleges',
    color: '#6c3fc5', 
    colorLight: 'rgba(108,63,197,0.08)', 
    gradFrom: '#6c3fc5', 
    gradTo: '#8e5cf5', 
    shadow: 'rgba(108,63,197,0.30)',
    extraLabel: 'ALL STANDARD FEATURES +',
    features: [
      'Operation Theatre Management',
      'Ambulance Services',
      'Blood Bank Management',
      'AI Analytics',
      'Custom Reports',
      'Unlimited Doctors',
      'Unlimited Staff',
      'Unlimited Beds',
      'Advanced Department Management',
      'Priority Patient Management',
      'Doctor Performance Insights',
      'Advanced Analytics Dashboard',
      'Multi-Specialty Support',
      'Full HMS Integration',
    ],
  },
];

export default function HospitalPlanSelection({ onDone }) {
  const { user, updateUserData, clinicType } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isIntentionalVisit = !!location.state?.intentionalVisit;
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState('plans');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPlan, setCurrentPlan] = useState(null);

  

  console.log('🏥 HospitalPlanSelection mounted:', { user, clinicType });

  // Fetch current plan on load
  useEffect(() => {
    const fetchCurrentPlan = async () => {
      try {
        if (user?.clinicId) {
          const response = await API.get('/plans/clinic');
          if (response.data.success) {
            const plan = response.data.plan;
            setCurrentPlan(plan);

            // Only auto-redirect on a forced/first visit — never when the
            // admin came here on purpose (e.g. "Upgrade Plan" from Profile).
            if (
              !isIntentionalVisit &&
              plan && plan.plan && plan.plan !== 'free' && plan.plan !== 'none'
            ) {
              if (onDone) { onDone(); } else { navigate('/dashboard'); }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching current plan:', err);
      }
    };
    fetchCurrentPlan();
  }, [user, navigate, onDone, isIntentionalVisit]);

  const plan = HOSPITAL_PLANS.find(p => p.key === selected);

  function choosePlan(key) { 
    if (currentPlan && currentPlan.plan === key) {
      setError('You are already on this plan!');
      return;
    }
    setSelected(key); 
    setStep('confirm');
    setError(null);
  }

  

async function handlePay() {
  setStep('paying');
  setLoading(true);
  setError(null);
  
  try {
    console.log('📡 Activating hospital plan:', selected);
    
    const response = await API.post('/plans/upgrade', {
      plan: selected,
      paymentMethod: 'card'
    });

    console.log('📡 Response:', response.data);

    if (response.data.success) {
      if (updateUserData) {
        updateUserData({ 
          activePlan: selected,
          planActivatedAt: response.data.clinic.planActivatedAt,
          planExpiresAt: response.data.clinic.planExpiresAt,
        });
      }
      
      // Clear the needsPlanSelection flag
      sessionStorage.removeItem('needsPlanSelection');
      
      // ── FIX: Show success page first, THEN redirect ──
      setStep('success');
      
      // And in handlePay function:
setTimeout(() => {
  if (onDone) {
    onDone();
  } else {
    window.location.href = '/dashboard';
  }
}, 3000);
      
    } else {
      throw new Error(response.data.message || 'Activation failed');
    }
  } catch (e) {
    console.error('❌ Activation error:', e);
    setError(e.response?.data?.message || e.message || 'Activation failed');
    setStep('confirm');
  } finally {
    setLoading(false);
  }
}

  const hasCurrentPlan = currentPlan && currentPlan.plan && currentPlan.plan !== 'free' && currentPlan.plan !== 'none';

  const hasPlan = (planKey) => {
    if (!currentPlan || !currentPlan.plan) return false;
    return currentPlan.plan === planKey;
  };

  const isOnHighestPlan = hasPlan('enterprise');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(150deg,#e8f4fd 0%,#f0f8ff 40%,#e8f9f5 100%)',
      display: 'flex', 
      alignItems: 'flex-start', 
      justifyContent: 'center',
      padding: '32px 16px 48px',
      fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes popIn{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.14)}100%{transform:scale(1);opacity:1}}
        .plan-card{transition:transform 0.22s,box-shadow 0.22s!important}
        .plan-card:hover{transform:translateY(-6px)!important;box-shadow:0 24px 60px rgba(10,61,98,0.18)!important}
        .pay-btn:hover{opacity:0.88!important}
        .feature-row{display:flex;align-items:flex-start;gap:9px;font-size:13.5px;margin-bottom:7px}
      `}</style>

      {/* ══ PLANS ══ */}
      {step === 'plans' && (
        <div style={{width:'100%',maxWidth:1080,animation:'fadeUp 0.45s ease'}}>
          {/* Brand */}
          <div style={{textAlign:'center',marginBottom:8}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:8,marginBottom:4}}>
              <div style={{width:38,height:38,borderRadius:10,background:'linear-gradient(135deg,#0a3d62,#1565a8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>➕</div>
              <span style={{fontFamily:'Georgia,serif',fontWeight:700,fontSize:22,color:C.brand,letterSpacing:1}}>CURELEX</span>
            </div>
            <div style={{fontSize:12,color:C.textMuted,letterSpacing:1}}>Smart Hospital. Stronger Care.</div>
          </div>

          {/* Heading */}
          <div style={{textAlign:'center',marginBottom:36,marginTop:20}}>
            {isOnHighestPlan ? (
  <div style={{
    marginTop:12, fontSize:13, color:'#00a878', fontWeight:600,
    display:'inline-flex', alignItems:'center', gap:6,
    background:'rgba(0,184,148,0.08)', border:'1px solid rgba(0,184,148,0.25)',
    borderRadius:20, padding:'6px 16px',
  }}>
    🏆 You're on our highest plan — Enterprise
  </div>
) :
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(0,184,148,0.10)',border:'1px solid rgba(0,184,148,0.25)',borderRadius:20,padding:'4px 14px',fontSize:12.5,color:'#00a878',fontWeight:600,marginBottom:14}}>
              {hasCurrentPlan ? '🔄 Upgrade Your Plan' : '🎉 Choose Your Hospital Plan'}
            </div>}
            <div style={{fontFamily:'Georgia,serif',fontSize:32,fontWeight:700,color:C.textDark,marginBottom:10,lineHeight:1.2, marginTop: 20}}>
              Choose the Plan That Grows With Your Hospital
            </div>
            <div style={{color:C.textMuted,fontSize:14.5,maxWidth:520,margin:'0 auto',lineHeight:1.65}}>
              {hasCurrentPlan 
                ? `You're currently on the ${currentPlan?.planLabel || currentPlan?.plan} plan. Select a new plan to upgrade.`
                : 'Select a plan to activate your hospital dashboard and start managing patients.'}
            </div>
            {hasCurrentPlan && (
              <div style={{marginTop:12,fontSize:13,color:C.textMuted}}>
                Current plan: <strong style={{color:C.brand}}>{currentPlan.planLabel || currentPlan.plan}</strong>
                {currentPlan.daysRemaining > 0 && ` · ${currentPlan.daysRemaining} days remaining`}
              </div>
            )}
            {!hasCurrentPlan && (
              <div style={{marginTop:12,fontSize:13,color:C.textMuted}}>
                You're currently on the <strong style={{color:C.brand}}>Free Plan</strong>. Choose a plan to unlock more features.
              </div>
            )}
          </div>

          {/* Plan cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:22}}>
            {HOSPITAL_PLANS.map(p => {
  const isCurrentPlan = hasPlan(p.key);
  const isDowngrade = isOnHighestPlan && p.key !== 'enterprise';
  const isDisabled = isCurrentPlan || isDowngrade;
              
              const color = p.color;
              const colorLight = p.colorLight;
              const gradFrom = p.gradFrom;
              const gradTo = p.gradTo;
              const shadow = p.shadow;
              const icon = p.icon;
              const badge = p.badge;
              
              const featureList = p.features || [];

              return (
                <div key={p.key} className="plan-card" style={{
                  position:'relative',
                  background:C.white,
                  borderRadius:22,
                  padding:'0 0 26px',
                  border: isCurrentPlan ? `3px solid ${color}` : `2px solid ${color}40`,
                  boxShadow: isCurrentPlan ? `0 8px 32px ${color}30` : `0 8px 32px ${colorLight}`,
                  overflow:'hidden'
                }}>
                  {isCurrentPlan && (
                    <div style={{
                      position:'absolute',
                      top:10,
                      right:10,
                      background:color,
                      color:'#fff',
                      fontSize:10,
                      fontWeight:700,
                      padding:'3px 12px',
                      borderRadius:20,
                      zIndex:10,
                    }}>
                      Current Plan
                    </div>
                  )}
                  <div style={{
                    background:`linear-gradient(135deg,${gradFrom},${gradTo})`,
                    padding:'22px 24px 18px',
                    marginBottom:20,
                    position:'relative'
                  }}>
                    {badge && (
                      <div style={{
                        position:'absolute',
                        top:14,
                        right:14,
                        background:'rgba(255,255,255,0.22)',
                        color:'#fff',
                        fontSize:10.5,
                        fontWeight:700,
                        padding:'3px 10px',
                        borderRadius:20,
                        border:'1px solid rgba(255,255,255,0.3)'
                      }}>
                        {badge}
                      </div>
                    )}
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                      <div style={{
                        width:48,
                        height:48,
                        borderRadius:12,
                        background:'rgba(255,255,255,0.18)',
                        border:'1.5px solid rgba(255,255,255,0.3)',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        fontSize:24
                      }}>
                        {icon}
                      </div>
                      <div>
                        <div style={{color:'#fff',fontWeight:800,fontSize:20,fontFamily:'Georgia,serif'}}>
                          {p.name}
                        </div>
                        <div style={{color:'rgba(255,255,255,0.75)',fontSize:12,lineHeight:1.4,maxWidth:200}}>
                          {p.tagline}
                        </div>
                      </div>
                    </div>
                    <div style={{marginTop:10}}>
                      <span style={{fontSize:13,color:'rgba(255,255,255,0.8)',fontWeight:500}}>₹</span>
                      <span style={{fontSize:40,fontWeight:800,color:'#fff',lineHeight:1}}>
                        {p.price.toLocaleString()}
                      </span>
                      <span style={{fontSize:13,color:'rgba(255,255,255,0.75)'}}> /month</span>
                    </div>
                  </div>
                  <div style={{padding:'0 22px',marginBottom:20}}>
                    {p.extraLabel && (
                      <div style={{
                        fontSize:10.5,
                        fontWeight:700,
                        color:color,
                        textTransform:'uppercase',
                        letterSpacing:0.7,
                        marginBottom:10,
                        background:colorLight,
                        borderRadius:6,
                        padding:'4px 8px',
                        display:'inline-block'
                      }}>
                        {p.extraLabel}
                      </div>
                    )}
                    {featureList.slice(0, 8).map((feat, i) => (
                      <div key={i} className="feature-row">
                        <span style={{
                          width:18,
                          height:18,
                          borderRadius:'50%',
                          flexShrink:0,
                          marginTop:1,
                          background:`linear-gradient(135deg,${gradFrom},${gradTo})`,
                          color:'#fff',
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          fontSize:10,
                          fontWeight:700
                        }}>
                          ✓
                        </span>
                        <span style={{color:C.textDark,lineHeight:1.4}}>{feat}</span>
                      </div>
                    ))}
                    {featureList.length > 8 && (
                      <div style={{fontSize:12,color:C.textMuted,textAlign:'center',marginTop:8}}>
                        + {featureList.length - 8} more features
                      </div>
                    )}
                  </div>
                  <div style={{padding:'0 22px'}}>
                    <button 
    onClick={() => choosePlan(p.key)} 
    className="pay-btn"
    disabled={isDisabled}
    style={{
      width:'100%',
      padding:'13px 20px',
      borderRadius:11,
      border:'none',
      background: isDisabled ? '#94a3b8' : `linear-gradient(135deg,${gradFrom},${gradTo})`,
      color:'#fff',
      fontSize:15,
      fontWeight:700,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      boxShadow: isDisabled ? 'none' : `0 5px 18px ${shadow}`,
      transition:'opacity 0.18s',
      opacity: isDisabled ? 0.7 : 1,
    }}
  >
    {isCurrentPlan
      ? '✓ Already Have This Plan'
      : isDowngrade
        ? '🔒 Lower Tier Plan'
        : `Choose ${p.name} →`}
  </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Why Curelex */}
          <div style={{marginTop:40,textAlign:'center'}}>
            <div style={{fontSize:13,fontWeight:700,color:C.textMuted,textTransform:'uppercase',letterSpacing:1,marginBottom:18}}>
              WHY HOSPITALS CHOOSE CURELEX?
            </div>
            <div style={{display:'flex',justifyContent:'center',gap:24,flexWrap:'wrap',marginBottom:20}}>
              {[
                {icon:'⚡',label:'Fast Patient Handling'},
                {icon:'🏥',label:'Complete HMS Solution'},
                {icon:'👤',label:'Easy Patient Records'},
                {icon:'₹',label:'Affordable Plans'},
                {icon:'📈',label:'Scalable Platform'},
                {icon:'🔒',label:'Secure & Cloud Based'}
              ].map(({icon,label}) => (
                <div key={label} style={{textAlign:'center',minWidth:90}}>
                  <div style={{
                    width:44,
                    height:44,
                    borderRadius:12,
                    background:'#fff',
                    border:'1.5px solid #dce9f5',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    fontSize:18,
                    margin:'0 auto 6px',
                    boxShadow:'0 2px 8px rgba(10,61,98,0.06)'
                  }}>
                    {icon}
                  </div>
                  <div style={{fontSize:11,color:C.textMuted,fontWeight:500,lineHeight:1.3,maxWidth:80}}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:12.5,color:C.textLight}}>
              🔒 No hidden fees · Cancel anytime · Plans renew monthly
            </div>
          </div>

          {/* Demo CTA */}
          <div style={{
            marginTop:28,
            background:'linear-gradient(135deg,#0a3d62,#1565a8)',
            borderRadius:18,
            padding:'22px 28px',
            display:'flex',
            alignItems:'center',
            justifyContent:'space-between',
            flexWrap:'wrap',
            gap:16
          }}>
            <div>
              <div style={{color:'#fff',fontWeight:700,fontSize:17,fontFamily:'Georgia,serif'}}>
                📞 Book a Free Demo Today!
              </div>
              <div style={{color:'rgba(255,255,255,0.75)',fontSize:13,marginTop:4}}>
                Experience the Future of Hospital Management
              </div>
              <div style={{display:'flex',gap:16,marginTop:8,flexWrap:'wrap'}}>
                {['✅ Easy to Use','✅ Secure','✅ Reliable','✅ Made for Hospitals'].map(t => (
                  <span key={t} style={{fontSize:11.5,color:'rgba(255,255,255,0.8)'}}>{t}</span>
                ))}
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{color:'#fff',fontWeight:700,fontSize:15}}>+91 74118 93735</div>
              <div style={{color:'rgba(255,255,255,0.75)',fontSize:12,marginTop:3}}>www.curelex.in</div>
              <div style={{color:'rgba(255,255,255,0.75)',fontSize:12}}>hello@curelex.in</div>
            </div>
          </div>
        </div>
      )}

      {/* ══ CONFIRM ══ */}
      {step === 'confirm' && plan && (
        <div style={{width:'100%',maxWidth:440,animation:'fadeUp 0.4s ease'}}>
          <button 
            onClick={() => setStep('plans')} 
            style={{
              background:'none',
              border:'none',
              cursor:'pointer',
              color:C.textMuted,
              fontSize:13.5,
              display:'flex',
              alignItems:'center',
              gap:6,
              marginBottom:18,
              padding:0,
              fontFamily:'inherit'
            }}
          >
            ← Back to Plans
          </button>
          <div style={{
            background:C.white,
            borderRadius:22,
            padding:'32px 30px',
            boxShadow:'0 20px 60px rgba(10,61,98,0.13)',
            border:'1px solid rgba(10,61,98,0.07)',
            position:'relative',
            overflow:'hidden'
          }}>
            <div style={{
              position:'absolute',
              top:0,
              left:0,
              right:0,
              height:4,
              background: `linear-gradient(90deg,${plan.gradFrom},${plan.gradTo})`
            }}/>
            <div style={{fontFamily:'Georgia,serif',fontSize:22,fontWeight:700,color:C.textDark,marginBottom:22}}>
              {hasCurrentPlan ? 'Upgrade Summary' : 'Order Summary'}
            </div>
            
            {error && (
              <div style={{background:'#fee2e2',color:'#991b1b',padding:'12px 16px',borderRadius:8,marginBottom:16,fontSize:13}}>
                ⚠️ {error}
              </div>
            )}
            
            {hasCurrentPlan && currentPlan && currentPlan.plan !== plan.key && (
              <div style={{
                background:'rgba(21,101,168,0.06)',
                border:'1px solid rgba(21,101,168,0.2)',
                borderRadius:10,
                padding:'12px 16px',
                marginBottom:16,
                fontSize:13,
                color:C.textMuted,
                display:'flex',
                justifyContent:'space-between',
                alignItems:'center',
                flexWrap:'wrap',
                gap:8,
              }}>
                <span>Current Plan: <strong style={{color:C.brand}}>{currentPlan.planLabel || currentPlan.plan}</strong></span>
                <span>→</span>
                <span>New Plan: <strong style={{color:plan.color}}>{plan.name}</strong></span>
              </div>
            )}

            {!hasCurrentPlan && (
              <div style={{
                background:'rgba(0,184,148,0.06)',
                border:'1px solid rgba(0,184,148,0.2)',
                borderRadius:10,
                padding:'12px 16px',
                marginBottom:16,
                fontSize:13,
                color:C.textMuted,
                textAlign:'center',
              }}>
                🎉 You're currently on the Free Plan. Upgrading to <strong style={{color:plan.color}}>{plan.name}</strong> will unlock all features!
              </div>
            )}

            <div style={{
              background: plan.colorLight,
              border: `1.5px solid ${plan.color}30`,
              borderRadius:14,
              padding:'18px 20px',
              marginBottom:20,
              display:'flex',
              justifyContent:'space-between',
              alignItems:'center'
            }}>
              <div>
                <div style={{fontWeight:700,fontSize:17,color:C.textDark}}>
                  {plan.icon} {plan.name}
                </div>
                <div style={{fontSize:13,color:C.textMuted,marginTop:3}}>
                  Monthly · Renews in 30 days
                </div>
              </div>
              <div style={{fontWeight:800,fontSize:22,color:plan.color}}>
                ₹{plan.price.toLocaleString()}
              </div>
            </div>

            <div style={{marginBottom:22}}>
              <div style={{fontSize:11.5,fontWeight:600,color:C.textMuted,textTransform:'uppercase',letterSpacing:0.5,marginBottom:12}}>
                What's Included
              </div>
              {plan.features.slice(0, 8).map((feat, i) => (
                <div key={i} className="feature-row">
                  <span style={{
                    width:18,
                    height:18,
                    borderRadius:'50%',
                    background: plan.color,
                    color:'#fff',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    fontSize:10,
                    flexShrink:0,
                    fontWeight:700,
                    marginTop:1
                  }}>
                    ✓
                  </span>
                  <span style={{color:C.textDark,fontSize:13.5}}>{feat}</span>
                </div>
              ))}
              {plan.features.length > 8 && (
                <div style={{fontSize:12.5,color:C.textMuted,marginTop:6,paddingLeft:27}}>
                  + {plan.features.length - 8} more features
                </div>
              )}
            </div>

            <div style={{borderTop:`1px dashed ${C.border}`,margin:'18px 0'}}/>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <span style={{fontWeight:600,fontSize:15,color:C.textDark}}>Subscription</span>
              <span style={{fontWeight:700,fontSize:16,color:C.textDark}}>
                ₹{plan.price.toLocaleString()}
              </span>
            </div>

            {hasCurrentPlan && currentPlan && currentPlan.plan !== plan.key && currentPlan.daysRemaining > 0 && (
              <div style={{
                display:'flex',
                justifyContent:'space-between',
                alignItems:'center',
                marginBottom:8,
                fontSize:13,
                color:C.textMuted,
                padding:'8px 12px',
                background:'rgba(0,184,148,0.06)',
                borderRadius:8,
              }}>
                <span>Prorated amount ({currentPlan.daysRemaining} days remaining)</span>
                <span style={{fontWeight:700,color:'#00a878'}}>
                  ₹{Math.ceil((plan.price - (currentPlan.planPrice || 0)) / 30 * currentPlan.daysRemaining)}
                </span>
              </div>
            )}

            <button 
              onClick={handlePay} 
              disabled={loading} 
              className="pay-btn"
              style={{
                width:'100%',
                padding:'16px 20px',
                borderRadius:11,
                border:'none',
                background: loading ? '#94a3b8' : `linear-gradient(135deg,${C.accent},${C.accentLight})`,
                color:'#fff',
                fontSize:16,
                fontWeight:700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow:'0 5px 20px rgba(0,184,148,0.35)',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                gap:10,
                transition:'opacity 0.18s'
              }}
            >
              {loading ? 'Processing...' : hasCurrentPlan ? '🚀 Upgrade Plan' : '🚀 Pay Now & Activate Plan'}
            </button>
            <div style={{textAlign:'center',marginTop:12,fontSize:12,color:C.textLight}}>
              Instant activation · Secure payment
            </div>
          </div>
        </div>
      )}

      {/* ══ PAYING ══ */}
      {step === 'paying' && (
        <div style={{textAlign:'center',animation:'fadeUp 0.3s ease'}}>
          <div style={{
            width:74,
            height:74,
            border:'5px solid rgba(0,184,148,0.18)',
            borderTopColor:C.accent,
            borderRadius:'50%',
            animation:'spin 0.85s linear infinite',
            margin:'0 auto 24px'
          }}/>
          <div style={{fontFamily:'Georgia,serif',fontSize:23,fontWeight:700,color:C.textDark,marginBottom:8}}>
            {hasCurrentPlan ? 'Upgrading Your Plan…' : 'Activating Your Plan…'}
          </div>
          <div style={{color:C.textMuted,fontSize:14}}>Just a moment.</div>
        </div>
      )}

      {/* ══ SUCCESS ══ */}
      {step === 'success' && plan && (
        <div style={{width:'100%',maxWidth:420,textAlign:'center',animation:'fadeUp 0.45s ease'}}>
          <div style={{
            background:C.white,
            borderRadius:24,
            padding:'46px 32px 36px',
            boxShadow:'0 24px 72px rgba(10,61,98,0.15)',
            position:'relative',
            overflow:'hidden'
          }}>
            <div style={{
              position:'absolute',
              top:0,
              left:0,
              right:0,
              height:4,
              background: `linear-gradient(90deg,${plan.gradFrom},${plan.gradTo})`
            }}/>
            <div style={{fontSize:70,marginBottom:16,display:'block',animation:'popIn 0.55s ease both'}}>
              🎉
            </div>
            <div style={{fontFamily:'Georgia,serif',fontSize:28,fontWeight:700,color:C.textDark,marginBottom:8}}>
              {hasCurrentPlan ? 'Plan Upgraded!' : 'Plan Activated!'}
            </div>
            <div style={{color:C.textMuted,fontSize:14.5,lineHeight:1.7,marginBottom:26}}>
              Your <strong>{plan.name}</strong> is now live.<br/>
              You have full access to the hospital dashboard.
            </div>
            <div style={{
              background: plan.colorLight,
              border: `1.5px solid ${plan.color}25`,
              borderRadius:14,
              padding:'14px 20px',
              marginBottom:28,
              textAlign:'left',
              display:'flex',
              justifyContent:'space-between',
              alignItems:'center'
            }}>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:plan.color}}>
                  {plan.icon} {plan.name}
                </div>
                <div style={{fontSize:12.5,color:C.textMuted,marginTop:3}}>
                  ₹{plan.price.toLocaleString()} / month · Renews in 30 days
                </div>
              </div>
              <span style={{
                background:'rgba(0,184,148,0.12)',
                color:'#00a878',
                borderRadius:20,
                padding:'3px 11px',
                fontSize:11.5,
                fontWeight:700
              }}>
                ● Active
              </span>
            </div>
            <button 
              onClick={onDone || (() => navigate('/dashboard'))} 
              className="pay-btn"
              style={{
                width:'100%',
                padding:'14px 20px',
                borderRadius:11,
                border:'none',
                background:'linear-gradient(135deg,#0a3d62,#1565a8)',
                color:'#fff',
                fontSize:15,
                fontWeight:700,
                cursor:'pointer',
                boxShadow:'0 5px 18px rgba(10,61,98,0.28)',
                transition:'opacity 0.18s'
              }}
            >
              Go to Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}