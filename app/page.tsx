
"use client";
import { useState } from "react";
import { Line } from "react-chartjs-2";
import { CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Chart as ChartJS } from "chart.js";
import { runWheel, MediaParams, HPS_LIKE, HPX_LIKE, Sectors, RotorGeom, FlowSide, HXParams, w_from_T_RH } from "@/lib/model";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export default function Home() {
  const [media, setMedia] = useState<MediaParams>(HPX_LIKE);
  const [speed, setSpeed] = useState(8);
  const [thetaProc, setThetaProc] = useState(210);
  const [thetaReact, setThetaReact] = useState(150);
  const [thetaPurge, setThetaPurge] = useState(20);
  const [carry, setCarry] = useState(0.01);
  const [seal, setSeal] = useState(0.005);

  const [procFlow, setProcFlow] = useState(12);
  const [procTin, setProcTin] = useState(22);
  const [procRH, setProcRH] = useState(0.005);

  const [reactFlow, setReactFlow] = useState(8);
  const [reactTin, setReactTin] = useState(22);
  const [tri, setTRI] = useState(85);

  const [ntuMp, setNtuMp] = useState(2.0);
  const [ntuMr, setNtuMr] = useState(2.2);
  const [uaP, setUaP] = useState(18.0);
  const [uaR, setUaR] = useState(18.0);
  const [purgeEff, setPurgeEff] = useState(0.6);

  const geom: RotorGeom = { diameter: 2.5, thickness: 0.35, channel_phi: 0.78, speed_rpm: speed };
  const sec: Sectors = { theta_proc: thetaProc, theta_react: thetaReact, theta_purge: thetaPurge, f_carryover: carry, f_seal_leak: seal };
  const proc: FlowSide = { m_da: procFlow, T_in: procTin, w_in: w_from_T_RH(procTin, procRH) };
  const react: FlowSide = { m_da: reactFlow, T_in: reactTin, w_in: w_from_T_RH(reactTin, 0.01), TRI: tri };
  const hx: HXParams = { NTU_m_proc: ntuMp, NTU_m_react: ntuMr, UA_proc: uaP, UA_react: uaR, eff_purge: purgeEff };

  const res = runWheel(media, geom, sec, proc, react, hx);

  const dp = res.process_out.dewpoint_C.toFixed(1);
  const qh = res.Q_heater_kW.toFixed(1);
  const reactWet = res.react_wet_air_T_C.toFixed(1);
  const wout = (res.process_out.w * 1000).toFixed(3);

  const chartData = {
    labels: ["Proc in", "Proc out"],
    datasets: [
      {
        label: "Humidity ratio (g/kg)",
        data: [proc.w_in*1000, res.process_out.w*1000],
        borderColor: "rgb(14, 116, 144)", backgroundColor: "rgba(14,116,144,0.3)", tension: 0.3
      },
      {
        label: "Temperature (°C)",
        data: [procTin, res.process_out.T_C],
        borderColor: "rgb(99, 102, 241)", backgroundColor: "rgba(99,102,241,0.3)", tension: 0.3, yAxisID: 'y1'
      }
    ]
  };
  const chartOpts:any = {
    scales: {
      y: { title: { display: true, text: "g/kg" } },
      y1: { position: 'right', title: { display: true, text: "°C" } }
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: "0 auto", fontFamily: "system-ui" }}>
      <h1>ULDP Rotor Model (non‑proprietary)</h1>
      <p style={{ color: "#666" }}>Concept model for Li‑ion/SSB dry rooms. Calibrate NTUs/UA/media to known points.</p>

      <section style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, 1fr)", marginTop: 16 }}>
        <div>
          <h3>Media</h3>
          <button onClick={() => setMedia(HPS_LIKE)}>HPS‑like</button>
          <button onClick={() => setMedia(HPX_LIKE)} style={{ marginLeft: 8 }}>HPX‑like</button>
          <div>
            <label>Wheel speed (rpm)</label>
            <input type="number" value={speed} onChange={e=>setSpeed(parseFloat(e.target.value||"0"))}/>
          </div>
          <h3>Sectors & leakage</h3>
          <label>θ<sub>proc</sub></label><input type="number" value={thetaProc} onChange={e=>setThetaProc(parseFloat(e.target.value||"0"))}/>
          <label>θ<sub>react</sub></label><input type="number" value={thetaReact} onChange={e=>setThetaReact(parseFloat(e.target.value||"0"))}/>
          <label>θ<sub>purge</sub></label><input type="number" value={thetaPurge} onChange={e=>setThetaPurge(parseFloat(e.target.value||"0"))}/>
          <label>Carryover</label><input type="number" step="0.001" value={carry} onChange={e=>setCarry(parseFloat(e.target.value||"0"))}/>
          <label>Seal leak</label><input type="number" step="0.001" value={seal} onChange={e=>setSeal(parseFloat(e.target.value||"0"))}/>
        </div>

        <div>
          <h3>Process side</h3>
          <label>ṁ<sub>proc</sub> (kg/s DA)</label><input type="number" value={procFlow} onChange={e=>setProcFlow(parseFloat(e.target.value||"0"))}/>
          <label>T<sub>in</sub> (°C)</label><input type="number" value={procTin} onChange={e=>setProcTin(parseFloat(e.target.value||"0"))}/>
          <label>RH<sub>in</sub> (fraction)</label><input type="number" step="0.001" value={procRH} onChange={e=>setProcRH(parseFloat(e.target.value||"0"))}/>
          <h3>Reactivation</h3>
          <label>ṁ<sub>react</sub> (kg/s DA)</label><input type="number" value={reactFlow} onChange={e=>setReactFlow(parseFloat(e.target.value||"0"))}/>
          <label>T<sub>in</sub> (°C)</label><input type="number" value={reactTin} onChange={e=>setReactTin(parseFloat(e.target.value||"0"))}/>
          <label>TRI (°C)</label><input type="number" value={tri} onChange={e=>setTRI(parseFloat(e.target.value||"0"))}/>
        </div>

        <div>
          <h3>Transfer params</h3>
          <label>NTU<sub>m,proc</sub></label><input type="number" step="0.1" value={ntuMp} onChange={e=>setNtuMp(parseFloat(e.target.value||"0"))}/>
          <label>NTU<sub>m,react</sub></label><input type="number" step="0.1" value={ntuMr} onChange={e=>setNtuMr(parseFloat(e.target.value||"0"))}/>
          <label>UA<sub>proc</sub> (kW/K)</label><input type="number" step="1" value={uaP} onChange={e=>setUaP(parseFloat(e.target.value||"0"))}/>
          <label>UA<sub>react</sub> (kW/K)</label><input type="number" step="1" value={uaR} onChange={e=>setUaR(parseFloat(e.target.value||"0"))}/>
          <label>Purge eff (0..1)</label><input type="number" step="0.05" value={purgeEff} onChange={e=>setPurgeEff(parseFloat(e.target.value||"0"))}/>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h3>Results</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <div>Supply dew point: <b>{dp} °C</b></div>
          <div>Process w<sub>out</sub>: <b>{wout} g/kg</b></div>
          <div>Q<sub>heater</sub>: <b>{qh} kW</b></div>
          <div>React wet‑air T: <b>{reactWet} °C</b></div>
        </div>
        <div style={{ marginTop: 16 }}>
          <Line data={chartData} options={chartOpts}/>
        </div>
      </section>
    </main>
  );
}

