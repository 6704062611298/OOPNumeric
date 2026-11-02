import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import ResultView from '../components/ResultView.jsx';

export default function HistoryDetail() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getHistoryDetail(id)
      .then(setDetail)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <div>
        <div className="bg-red-50 border border-red-300 text-red-700 rounded p-4 mb-4">{error}</div>
        <Link to="/history" className="text-sky-700 hover:underline text-sm">← กลับหน้าประวัติ</Link>
      </div>
    );
  }
  if (!detail) return <div className="text-slate-500">กำลังโหลดรายละเอียด…</div>;

  return (
    <div>
      <Link to="/history" className="text-sky-700 hover:underline text-sm">
        ← กลับหน้าประวัติ
      </Link>

      <h1 className="text-xl font-bold mt-2 mb-4">
        โจทย์ #{detail.id} — {detail.method}
      </h1>

      {/* ข้อมูลโจทย์ */}
      <div className="step-box mb-4">
        <h2 className="font-semibold text-slate-800 mb-2">ข้อมูลโจทย์</h2>
        <dl className="text-sm space-y-1">
          <div className="flex gap-2">
            <dt className="text-slate-500 w-36">หมวด:</dt>
            <dd>{detail.category}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500 w-36">วิธีคำนวณ:</dt>
            <dd>{detail.method}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500 w-36">จำนวนครั้งที่คำนวณ:</dt>
            <dd className="font-mono">{detail.timesCalculated}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-slate-500 w-36">บันทึกครั้งแรก:</dt>
            <dd>{detail.createdAt}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Input:</dt>
            <dd className="mono bg-slate-50 border border-slate-200 rounded p-2 mt-1">
              {JSON.stringify(detail.input, null, 2)}
            </dd>
          </div>
        </dl>
      </div>

      {/* ประวัติการคำนวณแต่ละครั้ง */}
      <div className="step-box mb-4">
        <h2 className="font-semibold text-slate-800 mb-2">ประวัติการคำนวณ ({detail.calculations.length} ครั้ง)</h2>
        <div className="overflow-x-auto">
          <table className="table-num">
            <thead>
              <tr>
                <th>ครั้งที่</th>
                <th>คำตอบ</th>
                <th>เวลา</th>
              </tr>
            </thead>
            <tbody>
              {detail.calculations.map((c, i) => (
                <tr key={c.id}>
                  <td className="font-mono">{detail.calculations.length - i}</td>
                  <td className="font-mono">{c.answer}</td>
                  <td className="text-xs">{c.calculated_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ผลลัพธ์ล่าสุดแบบเต็ม */}
      <h2 className="font-semibold text-slate-800 mb-2">ผลลัพธ์ล่าสุด (แสดงวิธีทำ)</h2>
      {detail.result ? (
        <ResultView result={detail.result} />
      ) : (
        <p className="text-sm text-slate-400">ไม่มีข้อมูลผลลัพธ์</p>
      )}
    </div>
  );
}
