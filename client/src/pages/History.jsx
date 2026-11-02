import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function History() {
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  const load = () => {
    api
      .getHistory(100)
      .then((d) => {
        setItems(d.items);
        setTotal(d.total);
      })
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!window.confirm(`ลบโจทย์ #${id} และประวัติทั้งหมดของโจทย์นี้?`)) return;
    try {
      await api.deleteHistory(id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  if (error) {
    return <div className="bg-red-50 border border-red-300 text-red-700 rounded p-4">{error}</div>;
  }
  if (!items) return <div className="text-slate-500">กำลังโหลดประวัติ…</div>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">
        ประวัติการคำนวณ <span className="text-sm font-normal text-slate-500">({total} โจทย์)</span>
      </h1>

      {items.length === 0 ? (
        <div className="text-sm text-slate-400 border border-dashed border-slate-300 rounded-lg p-8 text-center">
          ยังไม่มีประวัติการคำนวณ —{' '}
          <Link to="/calculator" className="text-sky-700 hover:underline">
            เริ่มคำนวณโจทย์แรก
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto step-box">
          <table className="table-num">
            <thead>
              <tr>
                <th>#</th>
                <th>หมวด</th>
                <th>วิธีคำนวณ</th>
                <th>ข้อมูล (input)</th>
                <th>จำนวนครั้ง</th>
                <th>คำนวณล่าสุด</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="font-mono">{it.id}</td>
                  <td>{it.category}</td>
                  <td>{it.method}</td>
                  <td className="max-w-xs truncate font-mono text-xs" title={JSON.stringify(it.input)}>
                    {JSON.stringify(it.input)}
                  </td>
                  <td className="font-mono">{it.timesCalculated}</td>
                  <td className="text-xs">{it.lastCalculatedAt}</td>
                  <td className="space-x-2 whitespace-nowrap">
                    <Link to={`/history/${it.id}`} className="text-sky-700 hover:underline text-sm">
                      ดู
                    </Link>
                    <button
                      onClick={() => handleDelete(it.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
