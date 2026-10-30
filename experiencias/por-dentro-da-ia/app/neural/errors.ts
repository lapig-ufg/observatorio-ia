export class SourceError extends Error {
  line: number | null;
  col: number | null;

  constructor(message: string, line: number | null = null, col: number | null = null) {
    super(message);
    this.name = "SourceError";
    this.line = line;
    this.col = col;
  }

  asDict() {
    return { message: this.message, line: this.line, col: this.col };
  }
}

export class NNError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NNError";
  }
}
