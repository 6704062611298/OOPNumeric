/**
 * แสดงผลลัพธ์การคำนวณ: คำตอบ, ขั้นตอนวิธีทำ, ตาราง iteration
 * ใช้ร่วมกันทั้งหน้า Calculator และหน้า HistoryDetail
 */

export function ResultTable({ table }) {
  if (!table || !table.rows || table.rows.length === 0) return null;
  return (
    <div className="overflow-x-auto">
      <table className="table-num">
        <thead>
          <tr>
            {table.columns.map((c, i) => (
              <th key={i}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} className="font-mono">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ResultView({ result, methodInfo }) {
  if (!result) return null;
  return (
    <div className="space-y-4">
      {/* คำตอบสุดท้าย */}
      <div className="rounded-lg border-2 border-sky-500 bg-sky-50 p-4">
        <div className="text-xs uppercase tracking-wide text-sky-700 font-semibold mb-1">
          คำตอบ{methodInfo ? ` — ${methodInfo.name}` : ''}
        </div>
        <div className="text-lg font-bold font-mono break-words">{result.answer}</div>
        {result.meta && result.meta.converged === false && (
          <div className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-300 rounded px-3 py-1.5">
            ⚠ การทำซ้ำไม่ลู่เข้าภายในเงื่อนไขที่กำหนด — ค่าที่แสดงเป็นค่าประมาณจากรอบสุดท้าย
          </div>
        )}
      </div>

      {/* ตารางหลัก (iteration / ค่าที่ใช้คำนวณ) */}
      {result.table && (
        <div className="step-box">
          <h3 className="font-semibold text-slate-800 mb-2">
            ตาราง{result.meta && result.meta.iterations !== undefined ? 'การทำซ้ำ (Iteration)' : 'ค่าที่ใช้คำนวณ'}
          </h3>
          <ResultTable table={result.table} />
        </div>
      )}

      {/* ขั้นตอนวิธีทำ */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-2">วิธีทำ</h3>
        <div className="space-y-3">
          {(result.steps || []).map((step, i) => (
            <div key={i} className="step-box">
              <div className="font-medium text-slate-700 mb-2">
                {i + 1}. {step.title}
              </div>
              {step.lines && step.lines.length > 0 && (
                <div className="mono text-slate-800 space-y-0.5">
                  {step.lines.map((line, li) => (
                    <div key={li}>{line}</div>
                  ))}
                </div>
              )}
              {step.table && <ResultTable table={step.table} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
