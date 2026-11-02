import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const CATEGORY_TH = {
  root: 'หาผลเฉลยของสมการ',
  linear: 'ระบบสมการเชิงเส้น',
  interpolation: 'การประมาณค่าในช่วง',
  extrapolation: 'การประมาณค่านอกช่วง',
  integration: 'การอินทิเกรต',
  differentiation: 'การหาอนุพันธ์',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 text-red-700 rounded p-4">
        {error}
        <div className="text-sm mt-2">
          กรุณาตรวจสอบว่า Backend ทำงานอยู่ (หน้านี้ต้องการการเชื่อมต่อฐานข้อมูล)
        </div>
      </div>
    );
  }
  if (!stats) return <div className="text-slate-500">กำลังโหลดข้อมูล Dashboard…</div>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Dashboard</h1>

      {/* สรุปภาพรวม */}
      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div className="step-box">
          <div className="text-sm text-slate-500">จำนวนโจทย์ทั้งหมด</div>
          <div className="text-3xl font-bold text-sky-700">{stats.totalProblems}</div>
        </div>
        <div className="step-box">
          <div className="text-sm text-slate-500">จำนวนครั้งที่คำนวณ</div>
          <div className="text-3xl font-bold text-sky-700">{stats.totalCalculations}</div>
        </div>
      </div>

      {/* แยกตามหมวด */}
      <div className="step-box mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">สถิติตามหมวดโจทย์</h2>
        {stats.byCategory.length === 0 ? (
          <p className="text-sm text-slate-400">ยังไม่มีข้อมูล — เริ่มคำนวณโจทย์แรกของคุณได้เลย</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-num">
              <thead>
                <tr>
                  <th>หมวด</th>
                  <th>จำนวนโจทย์</th>
                  <th>จำนวนครั้งที่คำนวณ</th>
                </tr>
              </thead>
              <tbody>
                {stats.byCategory.map((c) => (
                  <tr key={c.category}>
                    <td>
                      {c.category} <span className="text-slate-400 text-xs">({CATEGORY_TH[c.category] || ''})</span>
                    </td>
                    <td className="font-mono">{c.problems}</td>
                    <td className="font-mono">{c.calculations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* โจทย์ที่ใช้บ่อย */}
      <div className="step-box mb-6">
        <h2 className="font-semibold text-slate-800 mb-3">โจทย์ที่ถูกใช้งานบ่อย</h2>
        {stats.topProblems.length === 0 ? (
          <p className="text-sm text-slate-400">ยังไม่มีข้อมูล</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-num">
              <thead>
                <tr>
                  <th>#</th>
                  <th>หมวด</th>
                  <th>วิธีคำนวณ</th>
                  <th>จำนวนครั้ง</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {stats.topProblems.map((p, i) => (
                  <tr key={p.id}>
                    <td className="font-mono">{i + 1}</td>
                    <td>{p.category}</td>
                    <td>{p.method}</td>
                    <td className="font-mono">{p.times_calculated}</td>
                    <td>
                      <Link to={`/history/${p.id}`} className="text-sky-700 hover:underline text-sm">
                        ดูรายละเอียด
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Link
        to="/calculator"
        className="inline-block bg-sky-600 hover:bg-sky-700 text-white font-medium rounded px-6 py-2"
      >
        เริ่มคำนวณ →
      </Link>
    </div>
  );
}
