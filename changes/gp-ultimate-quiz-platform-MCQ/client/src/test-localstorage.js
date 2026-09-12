import { loadCode, getCodeOrBoilerplate } from './utils/codeStorage.js';
// Simulate localStorage returning ""
const saved = "";
console.log("If saved is empty string:", saved !== null ? saved : "Boilerplate");
