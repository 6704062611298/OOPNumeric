import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import MethodInput from '../components/MethodInput.jsx';
import ResultView from '../components/ResultView.jsx';

const CATEGORY_TH = {
  root: 'หาผลเฉลยของสมการ',
  linear: 'ระบบสมการเชิงเส้น',
  interpolation: 'การประมาณค่าในช่วง (Interpolation)',
  extrapolation: 'การประมาณค่านอกช่วง (Extrapolation)',
  integration: 'การอินทิเกรต (Integration)',
  differentiation: 'การหาอนุพันธ์ (Differentiation)',
};

export default function Calculator() {
  const { methodKey } = useParams();
  const [categories, setCategories] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [resultMethod, setResultMethod] = useState(null);

  useEffect(() => {
    api
      .getMethods()
      .then((d) => {
        if (!d || !Array.isArray(d.categories)) {
          throw new Error('รูปแบบข้อมูลจากเซิร์ฟเวอร์ไม่ถูกต้อง (ไม่พบรายการ categories)');
        }
        setCategories(d.categories);
      })
      .catch((e) => setError(e.message));
  }, []);

  const allMethods = useMemo(() => {
    if (!categories) return [];
    return categories.flatMap((c) => c.methods);
  }, [categories]);

  const selected = useMemo(
    () => allMethods.find((m) => m.key === methodKey) || null,
    [allMethods, methodKey]
  );

  if (error) {
    return <div className="bg-red-50 border border-red-300 text-red-700 rounded p-4">{error}</div>;
  }
  if (!categories) {
    return <div className="text-slate-500">กำลังโหลดรายการวิธีคำนวณ…</div>;
  }

  // ยังไม่ได้เลือกวิธี → แสดงตารางเลือกหมวด/วิธี
  if (!selected) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-4">เลือกวิธีคำนวณ</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map((cat) => (
            <div key={cat.key} className="step-box">
              <h2 className="font-semibold text-slate-800 mb-1">{cat.name}</h2>
              <div className="text-xs text-slate-500 mb-3">{CATEGORY_TH[cat.key] || ''}</div>
              <ul className="space-y-1">
                {cat.methods.map((m) => (
                  <li key={m.key}>
                    <Link
                      to={`/calculator/${m.key}`}
                      className="text-sky-700 hover:text-sky-900 hover:underline text-sm"
                    >
                      {m.name} <span className="text-slate-400">— {m.nameTh}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // เลือกวิธีแล้ว → แสดงฟอร์ม + ผลลัพธ์
  return (
    <div>
      <div className="flex items-center gap-2 text-sm mb-4">
        <Link to="/calculator" className="text-sky-700 hover:underline">
          ← เลือกวิธีคำนวณอื่น
        </Link>
      </div>
      <h1 className="text-xl font-bold mb-1">{selected.name}</h1>
      <p className="text-sm text-slate-500 mb-4">{selected.nameTh}</p>

      <div className="grid gap-6 lg:grid-cols-2 items-start">
        <div className="step-box">
          <h2 className="font-semibold text-slate-800 mb-3">กรอกข้อมูล</h2>
          <MethodInput
            method={selected}
            onResult={(data) => {
              setResult(data ? data.result : null);
              setResultMethod(data ? data.method : null);
            }}
          />
        </div>

        <div>
          {result ? (
            <ResultView result={result} methodInfo={resultMethod} />
          ) : (
            <div className="text-sm text-slate-400 border border-dashed border-slate-300 rounded-lg p-8 text-center">
              ผลลัพธ์จะแสดงที่นี่หลังกดคำนวณ
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
