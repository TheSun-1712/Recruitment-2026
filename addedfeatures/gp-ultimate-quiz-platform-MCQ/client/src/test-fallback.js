const codes = { 1: { python: "" } };
const currentQuestion = { id: 1 };
const language = "python";
function getCodeOrBoilerplate() { return "# Type your code here\n"; }
console.log(codes[currentQuestion.id]?.[language] || getCodeOrBoilerplate());
