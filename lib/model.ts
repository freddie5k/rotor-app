
// lib/model.ts
export type MediaParams = {
  name: string; q_s: number; b0: number; Ea: number; t: number; rho_s: number; eps: number;
};
export const HPS_LIKE: MediaParams = { name:"HPS_like_silica", q_s:0.25, b0:12, Ea:20e3, t:0.5, rho_s:350, eps:0.78 };
export const HPX_LIKE: MediaParams = { name:"HPX_like_molsieve", q_s:0.15, b0:50, Ea:25e3, t:0.35, rho_s:380, eps:0.75 };

export type RotorGeom = { diameter:number; thickness:number; channel_phi:number; speed_rpm:number; };
export type Sectors = { theta_proc:number; theta_react:number; theta_purge:number; f_carryover:number; f_seal_leak:number; };
export type FlowSide = { m_da:number; T_in:number; w_in:number; TRI?:number; };
export type HXParams = { NTU_m_proc:number; NTU_m_react:number; UA_proc:number; UA_react:number; eff_purge:number; };

const P_ATM = 101325.0, CP_DA = 1.005, CP_WV = 1.86, HFG0 = 2501.0;

function psat_pa(Tc:number):number{
  if (Tc>=0){
    return 611.21*Math.exp((18.678 - Tc/234.5)*(Tc/(257.14+Tc)));
  } else {
    return 611.21*Math.exp((23.036 - Tc/333.7)*(Tc/(279.82+Tc)));
  }
}
export function w_from_T_RH(Tc:number, RH:number, P:number=P_ATM):number{
  const Pv = RH*psat_pa(Tc); return 0.62198*Pv/Math.max(P-Pv,1e-6);
}
function RH_from_T_w(Tc:number, w:number, P:number=P_ATM):number{
  const Pv = (w*P)/(0.62198+w); return Pv/psat_pa(Tc);
}
function dewpoint_from_w(w:number, P:number=P_ATM):number{
  const Pv = (w*P)/(0.62198+w);
  let T=0; for (let i=0;i<50;i++){ const es=psat_pa(T); const dT=(Math.log(Pv/611.21)-Math.log(es/611.21))*5.0; T+=Math.max(Math.min(dT,5),-5); if (Math.abs(dT)<1e-4) break; }
  return T;
}
function h_moist_air(Tc:number, w:number):number{ return CP_DA*Tc + w*(HFG0 + CP_WV*Tc); }

function toth_isotherm_aw(a_w:number, T:number, q_s:number, b0:number, Ea:number, t:number){
  const R=8.314, T0=298.15; const bT=b0*Math.exp(Ea/R*(1.0/T0 - 1.0/T));
  const x=Math.max(Math.min(bT*Math.max(a_w,1e-9),1e6),1e-12);
  return q_s * (x)/((1.0 + Math.pow(x,t))**(1.0/t));
}
function eps_from_NTU(NTU:number, Cr:number){ return (1 - Math.exp(-NTU*(1-Cr))) / (1 - Cr*Math.exp(-NTU*(1-Cr)) + 1e-9); }

export function runWheel(media:MediaParams, geom:RotorGeom, sec:Sectors, proc:FlowSide, react:FlowSide, hx:HXParams, P:number=P_ATM){
  let theta_purge = Math.min(sec.theta_purge, sec.theta_react);
  const theta_tot = sec.theta_proc + sec.theta_react;
  const f_purge = theta_purge/theta_tot;

  const RH_p = Math.max(Math.min(RH_from_T_w(proc.T_in, proc.w_in, P),0.9999),1e-6);
  const RH_r = Math.max(Math.min(RH_from_T_w(react.TRI ?? react.T_in, react.w_in, P),0.9999),1e-9);

  const q_eq_p = toth_isotherm_aw(RH_p, proc.T_in+273.15, media.q_s, media.b0, media.Ea, media.t);
  const q_eq_r = toth_isotherm_aw(RH_r, (react.TRI ?? react.T_in)+273.15, media.q_s, media.b0, media.Ea, media.t);

  const Cmin_m = Math.min(proc.m_da, react.m_da);
  let eps_m_p = eps_from_NTU(hx.NTU_m_proc, proc.m_da/Math.max(react.m_da,1e-9));
  let eps_m_r = eps_from_NTU(hx.NTU_m_react, react.m_da/Math.max(proc.m_da,1e-9));
  let eps_m = 0.5*(eps_m_p + eps_m_r);
  if (RH_p < 0.01) eps_m *= 1.2;
  eps_m = Math.max(Math.min(eps_m,0.98),0.02);

  const w_star_proc = Math.max(1e-6, 0.000003);
  const w_star_react = Math.min(0.02, 0.005);

  const m_w_max_proc = Math.max(proc.w_in - w_star_proc, 0.0) * proc.m_da;
  const m_w_max_react = Math.max(w_star_react - react.w_in, 0.0) * react.m_da;
  const m_w_transfer = eps_m * Math.min(m_w_max_proc, m_w_max_react);
  const m_w_transfer_eff = m_w_transfer * (1.0 - hx.eff_purge*Math.min(f_purge,0.15));

  const wpout_ideal = Math.max(proc.w_in - m_w_transfer_eff/proc.m_da, 1e-9);

  const C_proc = proc.m_da*CP_DA, C_react = react.m_da*CP_DA, C_min = Math.min(C_proc, C_react);
  const eps_h = Math.max(Math.min(0.5*(eps_from_NTU(hx.UA_proc/Math.max(C_min,1e-6), C_proc/Math.max(C_react,1e-9))
                                   + eps_from_NTU(hx.UA_react/Math.max(C_min,1e-6), C_react/Math.max(C_proc,1e-9))),0.95),0.05);
  const Tpout_sens = proc.T_in + eps_h * ((react.TRI ?? react.T_in) - proc.T_in);

  const q_lat_proc = - m_w_transfer_eff * HFG0;
  const dT_lat_proc = q_lat_proc / Math.max(C_proc, 1e-6);
  const Tpout = Tpout_sens + dT_lat_proc;

  const dp_proc = dewpoint_from_w(wpout_ideal, P);
  const wrout = react.w_in + m_w_transfer_eff/Math.max(react.m_da,1e-9);

  const q_lat_react = + m_w_transfer_eff*HFG0;
  const Trout_sens = (react.TRI ?? react.T_in) - eps_h * ((react.TRI ?? react.T_in) - proc.T_in);
  const dT_lat_react = - q_lat_react / Math.max(C_react,1e-6);
  const Trout = Trout_sens + dT_lat_react;

  const carry = sec.f_carryover * (proc.m_da*wpout_ideal)/Math.max(react.m_da,1e-9);
  const wrout_eff = Math.min(wrout + carry, 0.03);
  const wpout_eff = Math.max(wpout_ideal + sec.f_seal_leak*(wrout - wpout_ideal), 1e-9);

  const Q_heater = Math.max(react.m_da*CP_DA*((react.TRI ?? react.T_in) - react.T_in), 0.0) + q_lat_react;
  const hpin = h_moist_air(proc.T_in, proc.w_in), hpout = h_moist_air(Tpout, wpout_eff);
  const hrir = h_moist_air(react.T_in, react.w_in), hrout = h_moist_air(Trout, wrout_eff);
  const E_balance = proc.m_da*(hpout-hpin) + react.m_da*(hrout-hrir) - Q_heater;

  return {
    process_out: { T_C: Tpout, w: wpout_eff, RH: Math.max(Math.min((function(){ const Pv=(wpout_eff*P)/(0.62198+wpout_eff); return Pv/psat_pa(Tpout); })(),0.9999),1e-7), dewpoint_C: dp_proc },
    react_out:   { T_C: Trout, w: wrout_eff, dewpoint_C: dewpoint_from_w(wrout_eff) },
    m_transfer_kgps: m_w_transfer_eff,
    Q_heater_kW: Q_heater,
    react_wet_air_T_C: Trout,
    balances: { E_balance_kW: E_balance },
    internals: { eps_m, eps_h, q_eq_p, q_eq_r }
  };
}
``
