import { useEffect, useState } from 'react';
import { api } from '../api.js';

/**
 * ฟอร์มกรอกข้อมูลแบบไดนามิก — สร้างจาก field definition ที่ได้จาก /api/methods
 * รองรับ type: expression | number | int | points | matrix
 * มี client-side validation พื้นฐาน (server ตรวจซ้ำอีกชั้นเสมอ)
 */

function ErrorMessage({ msg }) {
  if (!msg) return null;
  return <p className="text-sm text-red-600 mt-1">{msg}</p>;
}

function PointsEditor({ value, onChange, label }) {
  const points = Array.isArray(value) ? value : [];
  const setPoint = (i, key, v) => {
    const next = points.map((p, idx) => (idx === i ? { ...p, [key]: v } : p));
    onChange(next);
  };
  const addPoint = () => onChange([...points, { x: '', y: '' }]);
  const removePoint = (i) => onChange(points.filter((_, idx) => idx !== i));

  return (
    <div>
      <div className="text-sm font-medium text-slate-700 mb-1">{label}</div>
      <div className="space-y-2">
        {points.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-14">จุดที่ {i + 1}</span>
            <input
              type="number"
              step="any"
              placeholder="x"
              className="w-24 border border-slate-300 rounded px-2 py-1 text-sm"
              value={p.x}
              onChange={(e) => setPoint(i, 'x', e.target.value)}
            />
            <span className="text-slate-400">,</span>
            <input
              type="number"
              step="any"
              placeholder="y"
              className="w-24 border border-slate-300 rounded px-2 py-1 text-sm"
              value={p.y}
              onChange={(e) => setPoint(i, 'y', e.target.value)}
            />
            <button
              type="button"
              onClick={() => removePoint(i)}
              className="text-red-500 hover:text-red-700 text-sm px-2"
              title="ลบจุดนี้"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addPoint}
        className="mt-2 text-sm bg-slate-200 hover:bg-slate-300 rounded px-3 py-1"
      >
        + เพิ่มจุด
      </button>
      <p className="text-xs text-slate-500 mt-1">ต้องมีอย่างน้อย 2 จุด (ค่า x ห้ามซ้ำ)</p>
    </div>
  );
}

function MatrixEditor({ value, onChange, label }) {
  const n = Number(value?.n) || 2;
  const A = value?.A || Array.from({ length: n }, () => Array(n).fill(''));
  const b = value?.b || Array(n).fill('');

  // ปรับขนาดเมื่อเปลี่ยน n
  const resize = (newN) => {
    const newA = Array.from({ length: newN }, (_, i) =>
      Array.from({ length: newN }, (_, j) => (A[i] && A[i][j] !== undefined ? A[i][j] : ''))
    );
    const newB = Array.from({ length: newN }, (_, i) => (b[i] !== undefined ? b[i] : ''));
    onChange({ n: newN, A: newA, b: newB });
  };

  const setCell = (i, j, v) => {
    const newA = A.map((row, ri) => row.map((c, ci) => (ri === i && ci === j ? v : c)));
    onChange({ n, A: newA, b });
  };
  const setB = (i, v) => {
    const newB = b.map((c, ci) => (ci === i ? v : c));
    onChange({ n, A, b: newB });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <label className="text-xs text-slate-500">ขนาด n =</label>
        <select
          value={n}
          onChange={(e) => resize(Number(e.target.value))}
          className="border border-slate-300 rounded px-2 py-1 text-sm"
        >
          {[2, 3, 4, 5, 6].map((k) => (
            <option key={k} value={k}>
              {k}×{k}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <tbody>
            {Array.from({ length: n }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: n }, (_, j) => (
                  <td key={j} className="p-0.5">
                    <input
                      type="number"
                      step="any"
                      placeholder={`a${i + 1}${j + 1}`}
                      className="w-20 border border-slate-300 rounded px-2 py-1 text-sm"
                      value={A[i]?.[j] ?? ''}
                      onChange={(e) => setCell(i, j, e.target.value)}
                    />
                  </td>
                ))}
                <td className="p-0.5 text-slate-400">|</td>
                <td className="p-0.5">
                  <input
                    type="number"
                    step="any"
                    placeholder={`b${i + 1}`}
                    className="w-20 border border-slate-300 rounded px-2 py-1 text-sm bg-amber-50"
                    value={b[i] ?? ''}
                    onChange={(e) => setB(i, e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MethodInput({ method, onResult }) {
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // reset state เมื่อเปลี่ยนวิธีคำนวณ
  useEffect(() => {
    const init = {};
    for (const f of method.fields) {
      init[f.name] = f.type === 'points' ? [{ x: '', y: '' }, { x: '', y: '' }] :
                     f.type === 'matrix' ? { n: 2, A: [['', ''], ['', '']], b: ['', ''] } :
                     f.default !== undefined ? String(f.default) : '';
    }
    setValues(init);
    setError('');
  }, [method]);

  const setVal = (name, v) => setValues((prev) => ({ ...prev, [name]: v }));

  /** ตรวจ input ฝั่ง client ก่อนส่ง (server ตรวจซ้ำเสมอ) */
  const validateClient = () => {
    for (const f of method.fields) {
      const v = values[f.name];
      if (f.type === 'expression' || f.type === 'number' || f.type === 'int') {
        if (v === '' || v === undefined) {
          if (f.default !== undefined) continue;
          return `กรุณากรอก "${f.label}"`;
        }
        if (f.type !== 'expression' && Number.isNaN(Number(v))) {
          return `"${f.label}" ต้องเป็นตัวเลข`;
        }
      } else if (f.type === 'points') {
        const pts = Array.isArray(v) ? v : [];
        if (pts.length < 2) return 'จุดข้อมูลต้องมีอย่างน้อย 2 จุด';
        for (let i = 0; i < pts.length; i++) {
          if (pts[i].x === '' || pts[i].y === '' || Number.isNaN(Number(pts[i].x)) || Number.isNaN(Number(pts[i].y))) {
            return `จุดที่ ${i + 1}: กรอก x และ y เป็นตัวเลขให้ครบ`;
          }
        }
        const xs = pts.map((p) => Number(p.x));
        if (new Set(xs).size !== xs.length) return 'ค่า x ของแต่ละจุดต้องไม่ซ้ำกัน';
      } else if (f.type === 'matrix') {
        const n = Number(v?.n) || 2;
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            const c = v?.A?.[i]?.[j];
            if (c === '' || c === undefined || Number.isNaN(Number(c))) {
              return `เมทริกซ์ A: ช่องแถว ${i + 1} คอลัมน์ ${j + 1} ยังกรอกไม่ครบ`;
            }
          }
          const bv = v?.b?.[i];
          if (bv === '' || bv === undefined || Number.isNaN(Number(bv))) {
            return `เวกเตอร์ b: ช่องที่ ${i + 1} ยังกรอกไม่ครบ`;
          }
        }
      }
    }
    return null;
  };

  const buildPayload = () => {
    const payload = {};
    for (const f of method.fields) {
      const v = values[f.name];
      if (f.type === 'points') {
        payload[f.name] = (Array.isArray(v) ? v : [])
          .map((p) => ({ x: Number(p.x), y: Number(p.y) }));
      } else if (f.type === 'matrix') {
        const n = Number(v.n);
        payload[f.name] = {
          n,
          A: v.A.slice(0, n).map((row) => row.slice(0, n).map(Number)),
          b: v.b.slice(0, n).map(Number),
        };
      } else if (f.type === 'number' || f.type === 'int') {
        payload[f.name] = v === '' ? undefined : Number(v);
      } else {
        payload[f.name] = v;
      }
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const clientErr = validateClient();
    if (clientErr) {
      setError(clientErr);
      return;
    }
    setLoading(true);
    try {
      const data = await api.calculate(method.key, buildPayload());
      onResult(data);
    } catch (err) {
      setError(err.message);
      onResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {method.fields.map((f) => (
        <div key={f.name}>
          {f.type === 'expression' && (
            <>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {f.label}
                <span className="ml-2 text-xs text-slate-400">
                  (รองรับ + − * / ^ วงเล็บ sin cos tan sqrt exp ln log abs pi e และการคูณละเครื่องหมาย เช่น 2x)
                </span>
              </label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded px-3 py-2 font-mono text-sm"
                placeholder={f.placeholder || ''}
                value={values[f.name] ?? ''}
                onChange={(e) => setVal(f.name, e.target.value)}
              />
            </>
          )}
          {(f.type === 'number' || f.type === 'int') && (
            <>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {f.label}
                {f.default !== undefined && (
                  <span className="ml-2 text-xs text-slate-400">(ค่าเริ่มต้น {f.default})</span>
                )}
              </label>
              <input
                type="number"
                step={f.type === 'int' ? 1 : 'any'}
                className="w-full sm:w-48 border border-slate-300 rounded px-3 py-2 text-sm"
                value={values[f.name] ?? ''}
                onChange={(e) => setVal(f.name, e.target.value)}
              />
            </>
          )}
          {f.type === 'points' && (
            <PointsEditor value={values[f.name]} onChange={(v) => setVal(f.name, v)} label={f.label} />
          )}
          {f.type === 'matrix' && (
            <MatrixEditor value={values[f.name]} onChange={(v) => setVal(f.name, v)} label={f.label} />
          )}
        </div>
      ))}

      <ErrorMessage msg={error} />

      <button
        type="submit"
        disabled={loading}
        className="bg-sky-600 hover:bg-sky-700 disabled:bg-slate-400 text-white font-medium rounded px-6 py-2"
      >
        {loading ? 'กำลังคำนวณ…' : 'คำนวณ'}
      </button>
    </form>
  );
}
