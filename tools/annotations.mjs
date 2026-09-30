// Teaching data added on top of the verified problem bank.
// steps: a verified solution path (every "a op b = c" is checked by tests/steps.test.mjs)
// example: a problem in the same skill used for the rung 3 worked example
// display: how the final answer is written in a walkthrough
// unit: the answer's unit word (used by the leak guard)

export const ANNOTATIONS = {
  r01: {
    example: "r03", display: "3 : 4", unit: null,
    steps: [
      "The question asks for girls to boys, so the number of girls comes first.",
      "Girls to boys is 12 : 16. Both numbers can be divided by 4: 12 ÷ 4 = 3 and 16 ÷ 4 = 4.",
      "In simplest form, the ratio of girls to boys is 3 : 4.",
    ],
  },
  r02: {
    example: "r01", display: "5/8", unit: null,
    steps: [
      "First find all the fruit: 5 + 3 = 8 pieces.",
      "Apples are 5 of those 8 pieces.",
      "So apples are 5/8 of all the fruit.",
    ],
  },
  r03: {
    example: "r01", display: "3 : 2", unit: null,
    steps: [
      "The question asks for yogurt first, then strawberries.",
      "There are 3 cups of yogurt for every 2 cups of strawberries.",
      "So the ratio of yogurt to strawberries is 3 : 2.",
    ],
  },
  r04: {
    example: "r02", display: "3 : 4", unit: null,
    steps: [
      "Total games played: 18 + 6 = 24.",
      "Wins to total games is 18 : 24.",
      "Divide both by 6: 18 ÷ 6 = 3 and 24 ÷ 6 = 4, so the ratio is 3 : 4.",
    ],
  },
  r05: {
    example: "r06", display: "12 cups of flour", unit: "cups",
    steps: [
      "Sugar goes from 2 cups to 8 cups: 8 ÷ 2 = 4, so the recipe is 4 times as big.",
      "Flour has to grow by the same factor: 3 × 4 = 12.",
      "So 12 cups of flour go with 8 cups of sugar.",
    ],
  },
  r06: {
    example: "r08", display: "15 cups of yellow", unit: "cups",
    steps: [
      "Blue goes from 4 cups to 10 cups: 10 ÷ 4 = 2.5, so the mix is 2.5 times as big.",
      "Yellow has to grow by the same factor: 6 × 2.5 = 15.",
      "So 15 cups of yellow go with 10 cups of blue.",
    ],
  },
  r07: {
    example: "r05", display: "6 minutes", unit: "minutes",
    steps: [
      "Laps go from 5 to 15: 15 ÷ 5 = 3, so she runs 3 times as many laps.",
      "Time grows by the same factor: 2 × 3 = 6.",
      "So it takes Jada 6 minutes to run 15 laps.",
    ],
  },
  r08: {
    example: "r05", display: "18", unit: null,
    steps: [
      "The first numbers go from 6 to 12: 12 ÷ 6 = 2, so the ratio is doubled.",
      "The second number has to double too: 9 × 2 = 18.",
      "So 6 : 9 = 12 : 18.",
    ],
  },
  r09: {
    example: "r11", display: "50 miles per hour", unit: "miles",
    steps: [
      "Per hour means: how many miles for 1 hour?",
      "Split the miles evenly over the hours: 150 ÷ 3 = 50.",
      "So the car travels 50 miles per hour.",
    ],
  },
  r10: {
    example: "r09", display: "$0.25", unit: "dollars",
    steps: [
      "One pencil means: how many dollars for 1 pencil?",
      "Split the cost evenly over the pencils: 3 ÷ 12 = 0.25.",
      "So one pencil costs $0.25.",
    ],
  },
  r11: {
    example: "r09", display: "30 pages per hour", unit: "pages",
    steps: [
      "Per hour means: how many pages for 1 hour?",
      "Split the pages evenly over the hours: 45 ÷ 1.5 = 30.",
      "So Maya reads 30 pages per hour.",
    ],
  },
  r12: {
    example: "r09", display: "144 pages", unit: "pages",
    steps: [
      "First find the unit rate: 84 ÷ 7 = 12 pages per minute.",
      "Then use it for 12 minutes: 12 × 12 = 144.",
      "So the printer prints 144 pages in 12 minutes.",
    ],
  },
  r13: {
    example: "r16", display: "18", unit: null,
    steps: [
      "30% means 30 out of every 100, which is 0.3.",
      "Take that part of 60: 0.3 × 60 = 18.",
      "So 30% of 60 is 18.",
    ],
  },
  r14: {
    example: "r13", display: "75%", unit: "percent",
    steps: [
      "The whole is all 24 students, and the part is the 18 who chose pizza.",
      "Part divided by whole: 18 ÷ 24 = 0.75.",
      "Change it to a percent: 0.75 × 100 = 75, so 75% chose pizza.",
    ],
  },
  r15: {
    example: "r16", display: "$30", unit: "dollars",
    steps: [
      "25% off means the discount is 25% of $40: 0.25 × 40 = 10.",
      "Take the discount away from the price: 40 − 10 = 30.",
      "So the sale price is $30.",
    ],
  },
  r16: {
    example: "r14", display: "60", unit: null,
    steps: [
      "20% means 20 out of 100, which is 0.2. So 12 is 0.2 of the whole.",
      "To find the whole, divide: 12 ÷ 0.2 = 60.",
      "So 12 is 20% of 60.",
    ],
  },
  r17: {
    example: "r19", display: "$25", unit: "dollars",
    steps: [
      "Find the cost of 1 notebook: 10 ÷ 4 = 2.5 dollars.",
      "Then find the cost of 10 notebooks: 2.5 × 10 = 25.",
      "So 10 notebooks cost $25.",
    ],
  },
  r18: {
    example: "r17", display: "17.5 km", unit: "km",
    steps: [
      "Find how many km 1 cm stands for: 5 ÷ 2 = 2.5 km.",
      "Then use it for 7 cm: 2.5 × 7 = 17.5.",
      "So 7 cm stands for 17.5 km.",
    ],
  },
  r19: {
    example: "r18", display: "20", unit: null,
    steps: [
      "Proportional means y is always the same number times x. Find that number: 12 ÷ 3 = 4.",
      "So y is always 4 times x. When x is 5: 4 × 5 = 20.",
      "So y = 20 when x = 5.",
    ],
  },
  r20: {
    example: "r19", display: "6 cups of broth", unit: "cups",
    steps: [
      "People go from 6 to 9: 9 ÷ 6 = 1.5, so the soup is 1.5 times as big.",
      "Broth grows by the same factor: 4 × 1.5 = 6.",
      "So 9 people need 6 cups of broth.",
    ],
  },
};
