// The quiz content. Every answer here was checked by running the snippet in Node 22.
// `answer` is the index of the correct option.

export const QUESTIONS = [
  {
    code: `console.log([10, 1, 2].sort());`,
    options: ['[1, 2, 10]', '[1, 10, 2]', '[10, 2, 1]', 'TypeError'],
    answer: 1,
    why: 'Without a compare function, sort() converts items to strings and sorts them alphabetically, so "10" comes before "2".',
  },
  {
    code: `console.log(typeof null);`,
    options: ['"null"', '"undefined"', '"object"', '"number"'],
    answer: 2,
    why: 'A bug from the first version of JavaScript that can never be fixed without breaking the web: typeof null is "object".',
  },
  {
    code: `console.log(0.1 + 0.2 === 0.3);`,
    options: ['true', 'false', 'undefined', 'NaN'],
    answer: 1,
    why: 'Floating-point numbers cannot store 0.1 or 0.2 exactly. The sum is 0.30000000000000004.',
  },
  {
    code: `console.log("5" - 2, "5" + 2);`,
    options: ['3 7', '"3" "52"', '3 "52"', 'NaN "52"'],
    answer: 2,
    why: 'Minus only works on numbers, so "5" is converted to 5. Plus with a string concatenates, so 2 becomes "2".',
  },
  {
    code: `console.log(["1", "2", "3"].map(parseInt));`,
    options: ['[1, 2, 3]', '[1, NaN, NaN]', '[NaN, NaN, NaN]', '["1", "2", "3"]'],
    answer: 1,
    why: 'map passes (value, index), so this runs parseInt("1", 0), parseInt("2", 1) and parseInt("3", 2). Radix 1 is invalid and "3" is not a binary digit.',
  },
  {
    code: `for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i));\n}`,
    options: ['0 1 2', '3 3 3', '2 2 2', 'undefined ×3'],
    answer: 1,
    why: 'var is function-scoped, so all three callbacks share one i. By the time they run, the loop has finished and i is 3. With let you would get 0 1 2.',
  },
  {
    code: `console.log(1);\nsetTimeout(() => console.log(2));\nPromise.resolve().then(() => console.log(3));\nconsole.log(4);`,
    options: ['1 2 3 4', '1 4 2 3', '1 4 3 2', '1 3 4 2'],
    answer: 2,
    why: 'Synchronous code runs first (1, 4). Then the microtask queue (promise callbacks) empties before the next macrotask (setTimeout).',
  },
  {
    code: `console.log(Math.max());`,
    options: ['0', 'undefined', 'Infinity', '-Infinity'],
    answer: 3,
    why: 'Math.max starts from the smallest possible value and raises it for each argument. With no arguments, it returns that starting value: -Infinity.',
  },
];
