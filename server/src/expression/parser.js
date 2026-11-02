'use strict';
/**
 * Expression Parser — แปลงสมการ f(x) จากสตริงเป็นฟังก์ชัน JavaScript
 * ไม่ใช้ eval() เพื่อความปลอดภัย แต่เขียน Tokenizer + Recursive Descent Parser เอง
 *
 * รองรับ:
 *  - ตัวดำเนินการ: + - * / ^ (วงเล็บ)
 *  - การคูณแบบละเครื่องหมาย: 2x, 3(x+1), (x+1)(x-1)
 *  - ฟังก์ชัน: sin cos tan asin acos atan sqrt exp ln log abs
 *  - ค่าคงที่: pi, e
 *  - เลขยกกำลัง 10 เช่น 1e-6
 */

class ExprError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExprError';
  }
}

const FUNCTIONS = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sqrt: Math.sqrt,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  abs: Math.abs,
};

const CONSTANTS = { pi: Math.PI, e: Math.E };

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      if (!m) throw new ExprError(`ตัวเลขไม่ถูกต้องที่ตำแหน่งที่ ${i + 1}`);
      tokens.push({ type: 'num', value: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      const m = /^[a-zA-Z_][a-zA-Z_0-9]*/.exec(src.slice(i));
      tokens.push({ type: 'ident', value: m[0] });
      i += m[0].length;
      continue;
    }
    if ('+-*/^(),'.includes(ch)) {
      tokens.push({ type: ch });
      i++;
      continue;
    }
    throw new ExprError(`ไม่รู้จักอักขระ '${ch}' ที่ตำแหน่งที่ ${i + 1}`);
  }
  return tokens;
}

class Parser {
  constructor(tokens, varName) {
    this.tokens = tokens;
    this.pos = 0;
    this.varName = varName;
  }

  peek() {
    return this.tokens[this.pos];
  }

  next() {
    return this.tokens[this.pos++];
  }

  expect(type) {
    const t = this.next();
    if (!t || t.type !== type) {
      throw new ExprError(`รูปแบบสมการไม่ถูกต้อง: คาดว่าจะพบ '${type}'`);
    }
    return t;
  }

  parse() {
    const e = this.expr();
    if (this.pos < this.tokens.length) {
      throw new ExprError('รูปแบบสมการไม่ถูกต้อง (มีส่วนเกินที่ไม่สามารถตีความได้)');
    }
    return e;
  }

  expr() {
    let l = this.term();
    while (this.peek() && (this.peek().type === '+' || this.peek().type === '-')) {
      const op = this.next().type;
      l = { t: 'bin', op, l, r: this.term() };
    }
    return l;
  }

  term() {
    let l = this.unary();
    for (;;) {
      const t = this.peek();
      if (!t) break;
      if (t.type === '*' || t.type === '/') {
        const op = this.next().type;
        l = { t: 'bin', op, l, r: this.unary() };
      } else if (t.type === 'num' || t.type === 'ident' || t.type === '(') {
        // การคูณแบบละเครื่องหมาย เช่น 2x, 3(x+1)
        l = { t: 'bin', op: '*', l, r: this.unary() };
      } else {
        break;
      }
    }
    return l;
  }

  unary() {
    const t = this.peek();
    if (t && (t.type === '-' || t.type === '+')) {
      const op = this.next().type;
      return { t: 'un', op, e: this.unary() };
    }
    return this.power();
  }

  power() {
    const base = this.atom();
    if (this.peek() && this.peek().type === '^') {
      this.next();
      // ยกกำลังมีการเชื่อมโยงขวา: 2^3^2 = 2^(3^2)
      return { t: 'bin', op: '^', l: base, r: this.unary() };
    }
    return base;
  }

  atom() {
    const t = this.next();
    if (!t) throw new ExprError('สมการไม่สมบูรณ์ (จบก่อนกำหนด)');
    if (t.type === 'num') return { t: 'num', v: t.value };
    if (t.type === '(') {
      const e = this.expr();
      this.expect(')');
      return e;
    }
    if (t.type === 'ident') {
      if (FUNCTIONS[t.value]) {
        this.expect('(');
        const args = [this.expr()];
        while (this.peek() && this.peek().type === ',') {
          this.next();
          args.push(this.expr());
        }
        this.expect(')');
        return { t: 'call', name: t.value, args };
      }
      if (t.value in CONSTANTS) return { t: 'num', v: CONSTANTS[t.value] };
      if (t.value === this.varName) return { t: 'var' };
      throw new ExprError(`ไม่รู้จักสัญลักษณ์ '${t.value}' (ตัวแปรที่ใช้ได้คือ '${this.varName}')`);
    }
    throw new ExprError(`รูปแบบสมการไม่ถูกต้อง: ไม่คาดว่าจะพบ '${t.type}'`);
  }
}

function evaluate(node, x) {
  switch (node.t) {
    case 'num':
      return node.v;
    case 'var':
      return x;
    case 'un': {
      const v = evaluate(node.e, x);
      return node.op === '-' ? -v : v;
    }
    case 'bin': {
      const l = evaluate(node.l, x);
      const r = evaluate(node.r, x);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/':
          if (r === 0) throw new ExprError('เกิดการหารด้วยศูนย์ระหว่างคำนวณ f(x)');
          return l / r;
        case '^': {
          const p = Math.pow(l, r);
          if (!Number.isFinite(p)) throw new ExprError('ค่าการยกกำลังไม่นิยาม');
          return p;
        }
        default:
          throw new ExprError(`ตัวดำเนินการไม่รู้จัก ${node.op}`);
      }
    }
    case 'call': {
      const args = node.args.map((a) => evaluate(a, x));
      const v = FUNCTIONS[node.name](...args);
      if (!Number.isFinite(v)) throw new ExprError(`ฟังก์ชัน ${node.name} ให้ค่าที่ไม่นิยาม`);
      return v;
    }
    default:
      throw new ExprError('AST ไม่ถูกต้อง');
  }
}

/**
 * คอมไพล์สตริงสมการเป็นฟังก์ชัน f(x)
 * @param {string} src เช่น "x^3 - x - 2"
 * @param {string} varName ชื่อตัวแปร (ค่าเริ่มต้น 'x')
 * @returns {(x:number)=>number}
 */
function compile(src, varName = 'x') {
  if (typeof src !== 'string') throw new ExprError('สมการต้องเป็นข้อความ');
  const trimmed = src.trim();
  if (!trimmed) throw new ExprError('ไม่ได้กรอกสมการ');
  if (trimmed.length > 500) throw new ExprError('สมการยาวเกินไป (สูงสุด 500 ตัวอักษร)');
  const ast = new Parser(tokenize(trimmed), varName).parse();
  return (x) => evaluate(ast, x);
}

module.exports = { compile, ExprError };
