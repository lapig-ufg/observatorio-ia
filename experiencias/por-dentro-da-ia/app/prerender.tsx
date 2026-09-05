import { renderToString } from "react-dom/server";
import Lesson from "./page";

export function render() {
  return renderToString(<Lesson />);
}
