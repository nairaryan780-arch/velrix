export type IndustryKey =
  | "real_estate"
  | "coaching"
  | "education"
  | "agencies"
  | "interior_design"
  | "automotive"
  | "local_services"
  | "other";

export type QualificationTemplate = {
  key: string;
  prompt: string;
  required: boolean;
  weight: number;
};

export type IndustryConfig = {
  key: IndustryKey;
  label: string;
  sellHint: string;
  qualification: QualificationTemplate[];
  scoringHints: string[];
};

export const INDUSTRIES: IndustryConfig[] = [
  {
    key: "real_estate",
    label: "Real estate",
    sellHint: "Homes, apartments, plots, or commercial space",
    scoringHints: ["budget", "location", "timeline", "property type", "financing"],
    qualification: [
      { key: "location", prompt: "Which location or locality are you considering?", required: true, weight: 18 },
      { key: "budget", prompt: "What budget range are you working with?", required: true, weight: 22 },
      { key: "interest", prompt: "What property type are you looking for (for example 2BHK, villa, plot)?", required: true, weight: 16 },
      { key: "timeline", prompt: "When are you hoping to buy or move?", required: true, weight: 20 },
      { key: "financing", prompt: "Will you need home loan assistance?", required: false, weight: 8 },
    ],
  },
  {
    key: "coaching",
    label: "Coaching",
    sellHint: "Coaching programs, 1:1 sessions, or group programs",
    scoringHints: ["goal", "timeline", "budget", "commitment"],
    qualification: [
      { key: "interest", prompt: "Which program or outcome are you most interested in?", required: true, weight: 20 },
      { key: "timeline", prompt: "When would you like to start?", required: true, weight: 18 },
      { key: "budget", prompt: "What investment range feels comfortable?", required: true, weight: 18 },
      { key: "goal", prompt: "What does success look like for you in the next 90 days?", required: true, weight: 16 },
    ],
  },
  {
    key: "education",
    label: "Education",
    sellHint: "Courses, admissions, or training programs",
    scoringHints: ["course", "timeline", "budget", "eligibility"],
    qualification: [
      { key: "interest", prompt: "Which course or program are you exploring?", required: true, weight: 20 },
      { key: "timeline", prompt: "When would you like to begin?", required: true, weight: 16 },
      { key: "budget", prompt: "What fee range are you considering?", required: true, weight: 16 },
      { key: "eligibility", prompt: "What is your current education or experience level?", required: false, weight: 10 },
    ],
  },
  {
    key: "agencies",
    label: "Agencies",
    sellHint: "Retainers, projects, or specialized services",
    scoringHints: ["scope", "budget", "timeline", "decision maker"],
    qualification: [
      { key: "interest", prompt: "What service do you need help with?", required: true, weight: 18 },
      { key: "budget", prompt: "What monthly or project budget are you working with?", required: true, weight: 22 },
      { key: "timeline", prompt: "When do you need this to start?", required: true, weight: 16 },
      { key: "decision_maker", prompt: "Are you the decision maker for this engagement?", required: false, weight: 10 },
    ],
  },
  {
    key: "interior_design",
    label: "Interior design",
    sellHint: "Residential or commercial interior projects",
    scoringHints: ["space", "budget", "timeline", "location"],
    qualification: [
      { key: "interest", prompt: "What kind of space are you designing?", required: true, weight: 16 },
      { key: "location", prompt: "Where is the property located?", required: true, weight: 12 },
      { key: "budget", prompt: "What is your approximate project budget?", required: true, weight: 22 },
      { key: "timeline", prompt: "When would you like the project to begin?", required: true, weight: 16 },
    ],
  },
  {
    key: "automotive",
    label: "Automotive",
    sellHint: "Vehicles, servicing, or automotive products",
    scoringHints: ["model", "budget", "timeline", "financing"],
    qualification: [
      { key: "interest", prompt: "Which vehicle or service are you interested in?", required: true, weight: 20 },
      { key: "budget", prompt: "What budget range should we work within?", required: true, weight: 20 },
      { key: "timeline", prompt: "When are you looking to purchase or book?", required: true, weight: 16 },
      { key: "financing", prompt: "Would you like to explore financing options?", required: false, weight: 8 },
    ],
  },
  {
    key: "local_services",
    label: "Local services",
    sellHint: "Local service bookings and quotes",
    scoringHints: ["service", "location", "timeline", "budget"],
    qualification: [
      { key: "interest", prompt: "Which service do you need?", required: true, weight: 20 },
      { key: "location", prompt: "Which area should we serve?", required: true, weight: 16 },
      { key: "timeline", prompt: "When do you need this done?", required: true, weight: 18 },
      { key: "budget", prompt: "Do you have a budget in mind?", required: false, weight: 10 },
    ],
  },
  {
    key: "other",
    label: "Other",
    sellHint: "Your products or services",
    scoringHints: ["need", "budget", "timeline"],
    qualification: [
      { key: "interest", prompt: "What are you looking for?", required: true, weight: 20 },
      { key: "budget", prompt: "What budget range are you considering?", required: true, weight: 18 },
      { key: "timeline", prompt: "When would you like to move forward?", required: true, weight: 16 },
      { key: "name", prompt: "May I have your name?", required: true, weight: 8 },
    ],
  },
];

export function getIndustry(key: string) {
  return INDUSTRIES.find((i) => i.key === key) ?? INDUSTRIES[0];
}
