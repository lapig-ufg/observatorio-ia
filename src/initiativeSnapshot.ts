import snapshot from "../data/iniciativas.json";
import { initiativesFromRows } from "./catalog";

// Available before any live request; shared by the homepage and full UFG page.
export const fallbackInitiatives = initiativesFromRows(snapshot.values);
