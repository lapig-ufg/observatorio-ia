import { SourceError } from "./errors";

export type TokenType = "NAME" | "NUMBER" | "STRING" | "OP" | "KEYWORD" | "NEWLINE" | "EOF";

export interface Token {
  type: TokenType;
  value: unknown;
  line: number;
  col: number;
}

export type Expr =
  | { kind: "literal"; value: unknown; line: number; col: number }
  | { kind: "list"; items: Expr[]; line: number; col: number }
  | { kind: "name"; id: string; line: number; col: number }
  | { kind: "construct"; name: string; args: Arg[]; line: number; col: number }
  | { kind: "method"; obj: string; method: string; args: Arg[]; line: number; col: number }
  | { kind: "attribute"; obj: string; attr: string; line: number; col: number }
  | { kind: "index"; base: Expr; index: Expr; line: number; col: number };

export type Arg = [name: string | null, expr: Expr];

export type Statement =
  | { kind: "assign"; target: string; value: Expr; line: number; col: number }
  | { kind: "method"; obj: string; method: string; args: Arg[]; line: number; col: number };

export interface Program {
  statements: Statement[];
}

const KEYWORDS: Record<string, unknown> = { True: true, False: false, None: null };
const OPS = new Set(["=", "(", ")", "[", "]", "{", "}", ",", ".", ":"]);
const ESCAPES: Record<string, string> = { n: "\n", t: "\t", r: "\r" };

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let parenDepth = 0;
  let line = 1;
  let col = 1;
  let i = 0;

  const push = (type: TokenType, value: unknown, tokenLine: number, tokenCol: number) => {
    tokens.push({ type, value, line: tokenLine, col: tokenCol });
  };

  while (i < source.length) {
    const ch = source[i];

    if (ch === " " || ch === "\t") {
      i += 1;
      col += 1;
      continue;
    }

    if (ch === "\r") {
      i += 1;
      if (source[i] === "\n") i += 1;
      if (parenDepth === 0) push("NEWLINE", null, line, col);
      line += 1;
      col = 1;
      continue;
    }

    if (ch === "\n") {
      if (parenDepth === 0) push("NEWLINE", null, line, col);
      i += 1;
      line += 1;
      col = 1;
      continue;
    }

    if (ch === "#") {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }

    if (ch === "(" || ch === "[") {
      parenDepth += 1;
      push("OP", ch, line, col);
      i += 1;
      col += 1;
      continue;
    }

    if (ch === ")" || ch === "]") {
      parenDepth = Math.max(0, parenDepth - 1);
      push("OP", ch, line, col);
      i += 1;
      col += 1;
      continue;
    }

    if (OPS.has(ch)) {
      push("OP", ch, line, col);
      i += 1;
      col += 1;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      const startLine = line;
      const startCol = col;
      const start = i;
      let sawDot = false;
      let sawExp = false;
      while (i < source.length && /[0-9]/.test(source[i])) {
        i += 1;
        col += 1;
      }
      if (source[i] === "." && /[0-9]/.test(source[i + 1] ?? "")) {
        sawDot = true;
        i += 1;
        col += 1;
        while (i < source.length && /[0-9]/.test(source[i])) {
          i += 1;
          col += 1;
        }
      }
      if (source[i] === "e" || source[i] === "E") {
        const save = i;
        i += 1;
        col += 1;
        if (source[i] === "+" || source[i] === "-") {
          i += 1;
          col += 1;
        }
        if (/[0-9]/.test(source[i] ?? "")) {
          sawExp = true;
          while (i < source.length && /[0-9]/.test(source[i])) {
            i += 1;
            col += 1;
          }
        } else {
          i = save;
          col = startCol + (i - start);
        }
      }
      const text = source.slice(start, i);
      push("NUMBER", sawDot || sawExp ? Number.parseFloat(text) : Number.parseInt(text, 10), startLine, startCol);
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      const startLine = line;
      const startCol = col;
      const start = i;
      while (i < source.length && /[A-Za-z0-9_]/.test(source[i])) {
        i += 1;
        col += 1;
      }
      const word = source.slice(start, i);
      if (Object.prototype.hasOwnProperty.call(KEYWORDS, word)) {
        push("KEYWORD", KEYWORDS[word], startLine, startCol);
      } else {
        push("NAME", word, startLine, startCol);
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      const quote = ch;
      const startLine = line;
      const startCol = col;
      i += 1;
      col += 1;
      const pieces: string[] = [];
      while (true) {
        if (i >= source.length) throw new SourceError("a string não tem aspas de fechamento", startLine, startCol);
        const current = source[i];
        if (current === quote) {
          i += 1;
          col += 1;
          break;
        }
        if (current === "\\" && i + 1 < source.length) {
          const next = source[i + 1];
          pieces.push(ESCAPES[next] ?? next);
          i += 2;
          col += 2;
          continue;
        }
        if (current === "\n") throw new SourceError("a string não tem aspas de fechamento", startLine, startCol);
        pieces.push(current);
        i += 1;
        col += 1;
      }
      push("STRING", pieces.join(""), startLine, startCol);
      continue;
    }

    throw new SourceError(`caractere inesperado ${JSON.stringify(ch)}`, line, col);
  }

  push("EOF", null, line, col);
  return tokens;
}

function describe(token: Token) {
  if (token.type === "EOF") return "o fim do script";
  if (token.type === "NEWLINE") return "o fim da linha";
  if (token.type === "STRING") return `a string ${JSON.stringify(token.value)}`;
  return `'${String(token.value)}'`;
}

class Parser {
  tokens: Token[];
  i = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  peek(offset = 0) {
    return this.tokens[Math.min(this.i + offset, this.tokens.length - 1)];
  }

  advance() {
    const token = this.tokens[this.i];
    if (token.type !== "EOF") this.i += 1;
    return token;
  }

  check(type: TokenType, value?: unknown, offset = 0) {
    const token = this.peek(offset);
    return token.type === type && (value === undefined || token.value === value);
  }

  expect(type: TokenType, value?: unknown, what?: string) {
    const token = this.peek();
    if (token.type !== type || (value !== undefined && token.value !== value)) {
      const wanted = what ?? (value !== undefined ? String(value) : type.toLowerCase());
      throw new SourceError(`esperava ${wanted}, encontrou ${describe(token)}`, token.line, token.col);
    }
    return this.advance();
  }

  parseProgram(): Program {
    const statements: Statement[] = [];
    while (!this.check("EOF")) {
      if (this.check("NEWLINE")) {
        this.advance();
        continue;
      }
      statements.push(this.statement());
    }
    return { statements };
  }

  statement(): Statement {
    const token = this.peek();

    if (this.check("NAME", "for")) {
      throw new SourceError(
        "laços for não são suportados — escreva cada chamada nn.forward(valor, camada) (e cada nn.backward(valor, camada)) em sua própria linha",
        token.line,
        token.col,
      );
    }

    if (this.check("NAME") && this.check("OP", "=", 1)) {
      const name = this.advance();
      this.advance();
      const value = this.expression();
      this.endStatement();
      return { kind: "assign", target: String(name.value), value, line: name.line, col: name.col };
    }

    if (this.check("NAME") && this.check("OP", ".", 1) && this.check("NAME", undefined, 2) && this.check("OP", "(", 3)) {
      const obj = this.advance();
      this.advance();
      const method = this.advance();
      const args = this.callTail();
      this.endStatement();
      return {
        kind: "method",
        obj: String(obj.value),
        method: String(method.value),
        args,
        line: method.line,
        col: method.col,
      };
    }

    throw new SourceError(
      "cada linha precisa ser uma atribuição (Nome = ...) ou uma chamada de método (nome.metodo(...))",
      token.line,
      token.col,
    );
  }

  endStatement() {
    const token = this.peek();
    if (token.type === "EOF" || token.type === "NEWLINE") return;
    throw new SourceError(`sobrou ${describe(token)} depois da instrução`, token.line, token.col);
  }

  callTail(): Arg[] {
    this.expect("OP", "(");
    const args = this.args();
    this.expect("OP", ")");
    return args;
  }

  args(): Arg[] {
    const args: Arg[] = [];
    if (this.check("OP", ")")) return args;
    while (true) {
      args.push(this.arg());
      if (this.check("OP", ",")) {
        this.advance();
        if (this.check("OP", ")")) break;
        continue;
      }
      break;
    }
    return args;
  }

  arg(): Arg {
    if (this.check("NAME") && this.check("OP", "=", 1)) {
      const name = String(this.advance().value);
      this.advance();
      return [name, this.expression()];
    }
    return [null, this.expression()];
  }

  expression(): Expr {
    let expr = this.primary();
    while (this.check("OP", "[")) {
      const open = this.advance();
      const index = this.expression();
      this.expect("OP", "]", "']' para fechar o índice");
      expr = { kind: "index", base: expr, index, line: open.line, col: open.col };
    }
    return expr;
  }

  primary(): Expr {
    const token = this.peek();

    if (token.type === "NUMBER" || token.type === "STRING" || token.type === "KEYWORD") {
      this.advance();
      return { kind: "literal", value: token.value, line: token.line, col: token.col };
    }

    if (this.check("OP", "[")) {
      const open = this.advance();
      const items: Expr[] = [];
      if (!this.check("OP", "]")) {
        while (true) {
          items.push(this.expression());
          if (this.check("OP", ",")) {
            this.advance();
            if (this.check("OP", "]")) break;
            continue;
          }
          break;
        }
      }
      this.expect("OP", "]", "']' para fechar a lista");
      return { kind: "list", items, line: open.line, col: open.col };
    }

    if (token.type === "NAME") {
      if (this.check("OP", "(", 1)) {
        const name = this.advance();
        const args = this.callTail();
        return { kind: "construct", name: String(name.value), args, line: name.line, col: name.col };
      }
      this.advance();
      if (this.check("OP", ".")) {
        return this.qualified(token);
      }
      return { kind: "name", id: String(token.value), line: token.line, col: token.col };
    }

    throw new SourceError(`esperava um valor, encontrou ${describe(token)}`, token.line, token.col);
  }

  qualified(nameToken: Token): Expr {
    this.advance();
    const attr = this.expect("NAME", undefined, "um atributo ou método depois de '.'");

    if (this.check("OP", "(")) {
      this.advance();
      const args = this.args();
      this.expect("OP", ")");
      return {
        kind: "method",
        obj: String(nameToken.value),
        method: String(attr.value),
        args,
        line: nameToken.line,
        col: nameToken.col,
      };
    }

    return {
      kind: "attribute",
      obj: String(nameToken.value),
      attr: String(attr.value),
      line: nameToken.line,
      col: nameToken.col,
    };
  }
}

export function parseProgram(source: string): Program {
  return new Parser(tokenize(source)).parseProgram();
}
